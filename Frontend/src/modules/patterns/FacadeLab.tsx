import { useState } from "react";
import { kb, ms as fmtMs, num } from "../../lib/format";
import type { PerfEntry } from "../../lib/perf";
import {
  runBenchmark,
  type BenchMode,
  type BenchResult,
  type DashboardMode,
  type StatsResult,
} from "../../services/dashboardService";
import Icon from "../../ui/Icon";

const RTT_OPTIONS = [0, 25, 50, 100, 200];

interface Props {
  mode: DashboardMode;
  onMode: (mode: DashboardMode) => void;
  rtt: number;
  onRtt: (rtt: number) => void;
  result: StatsResult | null;
  loading: boolean;
  onRerun: () => void;
}

// Servicio al que pertenece cada ruta (para pintar el tiempo junto a cada microservicio).
const SERVICE_OF = (url: string) =>
  url.startsWith("/rooms") ? "rooms"
  : url.startsWith("/reservations") ? "reservations"
  : url.startsWith("/inventory") || url.startsWith("/products") ? "products"
  : url.startsWith("/clients") ? "clients"
  : "gateway";

const SERVICES = [
  { key: "rooms", label: "rooms-service", y: 8 },
  { key: "reservations", label: "reservations-service", y: 74 },
  { key: "products", label: "products-service", y: 140 },
  { key: "clients", label: "clients-service", y: 206 },
];

function serviceStat(entries: PerfEntry[], key: string) {
  const own = entries.filter((e) => SERVICE_OF(e.url) === key);
  if (own.length === 0) return null;
  return { ms: Math.max(...own.map((e) => e.ms)), bytes: own.reduce((s, e) => s + e.bytes, 0), count: own.length };
}

function Flow({ mode, result }: { mode: DashboardMode; result: StatsResult | null }) {
  const facade = mode === "facade";
  const entries = result?.entries ?? [];
  const reqs = facade ? 1 : 5;
  const ys = facade ? [140] : [112, 126, 140, 154, 168];

  return (
    <div className="flow-wrap">
      <svg className="flow" viewBox="0 0 720 262" role="img" aria-label={facade ? "El navegador hace una petición al gateway, que consulta los servicios" : "El navegador hace cinco peticiones, una por recurso"}>
        {/* navegador -> gateway */}
        {ys.map((y) => (
          <path key={y} className={"edge" + (facade ? "" : " bad thin")} d={`M150 ${y} L286 ${y}`} />
        ))}
        {/* gateway -> servicios */}
        {SERVICES.map((s) => (
          <path key={s.key} className={"edge out thin"} d={`M442 140 C510 140 506 ${s.y + 22} 566 ${s.y + 22}`} />
        ))}

        <rect className="node" x="10" y="96" width="140" height="88" rx="16" />
        <text x="80" y="134" textAnchor="middle" className="t-sm">Navegador</text>
        <text x="80" y="152" textAnchor="middle" className="t-mute">React · axios</text>
        <text x="218" y={facade ? 128 : 92} textAnchor="middle" className="t-ms">{reqs} {reqs === 1 ? "petición" : "peticiones"}</text>

        <rect className={"node gw" + (facade ? "" : " proxy")} x="290" y="80" width="150" height="120" rx="18" />
        <text x="365" y="122" textAnchor="middle" className="t-sm">api-gateway</text>
        <text x="365" y="141" textAnchor="middle" className="t-mute">{facade ? "Facade:" : "Proxy:"}</text>
        <text x="365" y="156" textAnchor="middle" className="t-mute">{facade ? "arma la respuesta" : "solo reenvía"}</text>
        {facade && result && (
          <text x="365" y="182" textAnchor="middle" className="t-ms">{fmtMs(result.ms)}</text>
        )}

        {SERVICES.map((s) => {
          const stat = !facade ? serviceStat(entries, s.key) : null;
          return (
            <g key={s.key}>
              <rect className="node" x="570" y={s.y} width="144" height="44" rx="12" />
              <text x="642" y={s.y + 19} textAnchor="middle" className="t-sm">{s.label}</text>
              <text x="642" y={s.y + 34} textAnchor="middle" className={stat ? "t-ms" : "t-mute"}>
                {stat ? `${fmtMs(stat.ms)} · ${kb(stat.bytes)}${stat.count > 1 ? ` · ×${stat.count}` : ""}` : facade ? "por la red interna" : "—"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Waterfall({ result }: { result: StatsResult }) {
  const entries = result.entries;
  if (entries.length === 0) return null;
  const t0 = Math.min(...entries.map((e) => e.start));
  const total = Math.max(...entries.map((e) => e.start - t0 + e.ms), 1);

  return (
    <div className="wf" aria-label="Cascada de peticiones">
      {entries.map((e) => (
        <div key={e.id} className="wf-row">
          <span className="nm" title={e.url}>{e.url}</span>
          <div className="tr-track">
            <div
              className={"tr-bar" + (e.url.includes("dashboard") ? " is-facade" : "")}
              style={{ left: `${((e.start - t0) / total) * 100}%`, width: `${(e.ms / total) * 100}%` }}
            />
          </div>
          <span className="val">{fmtMs(e.ms)} · {kb(e.bytes)}</span>
        </div>
      ))}
    </div>
  );
}

function BenchRow({ title, sub, mode, tone, max }: { title: string; sub: string; mode: BenchMode; tone: "facade" | "directo"; max: number }) {
  return (
    <div className="bench-row">
      <div>
        <div className="lbl2">{title}</div>
        <div className="sub">{sub} · {mode.requests} {mode.requests === 1 ? "petición" : "peticiones"} · {kb(mode.bytes)}</div>
      </div>
      <div className="bench-track" title={`mediana ${fmtMs(mode.stats.mediana)} · p95 ${fmtMs(mode.stats.p95)}`}>
        <div className={"bench-bar " + (tone === "facade" ? "is-facade" : "")} style={{ width: `${(mode.stats.media / max) * 100}%` }} />
        <div className="bench-p95" style={{ left: `calc(${Math.min(99, (mode.stats.p95 / max) * 100)}% - 1px)` }} />
      </div>
      <div className="val">{fmtMs(mode.stats.media)}</div>
    </div>
  );
}

export default function FacadeLab({ mode, onMode, rtt, onRtt, result, loading, onRerun }: Props) {
  const [n, setN] = useState(20);
  const [running, setRunning] = useState<{ done: number; total: number } | null>(null);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [benchError, setBenchError] = useState("");

  const run = async () => {
    setBenchError("");
    setBench(null);
    setRunning({ done: 0, total: n + 2 });
    try {
      setBench(await runBenchmark(n, rtt, (done, total) => setRunning({ done, total })));
    } catch {
      setBenchError("No se pudo completar la medición. Revisa que el api-gateway y los servicios estén encendidos.");
    } finally {
      setRunning(null);
    }
  };

  const max = bench ? Math.max(bench.facade.stats.p95, bench.directo.stats.p95, 1) * 1.05 : 1;

  return (
    <section className="card lab rise" style={{ ["--i" as string]: 1 }} aria-label="Laboratorio Facade">
      <div className="lab-top">
        <div>
          <h3 className="h3">Facade vs. sin Facade</h3>
          <div className="muted sm-text">
            El Panel necesita datos de varios microservicios. Elige cómo los pide y mira, en milisegundos, qué cambia.
          </div>
        </div>
        <button className="btn ghost sm" onClick={onRerun} disabled={loading}>
          <Icon name="refresh" />
          Volver a medir
        </button>
      </div>

      <div className="mode-cards" role="group" aria-label="Modo de consulta del panel">
        <button className={"mode-card is-facade" + (mode === "facade" ? " on" : "")} aria-pressed={mode === "facade"} onClick={() => onMode("facade")}>
          <span className="mc-tag">Con Facade</span>
          <b>El navegador hace 1 sola petición</b>
          <ol>
            <li>Pide <code>/dashboard/stats</code> al gateway.</li>
            <li>El gateway consulta los servicios por la red interna.</li>
            <li>Devuelve un resumen pequeño, ya armado.</li>
          </ol>
        </button>
        <button className={"mode-card is-direct" + (mode === "directo" ? " on" : "")} aria-pressed={mode === "directo"} onClick={() => onMode("directo")}>
          <span className="mc-tag">Sin Facade</span>
          <b>El navegador hace 5 peticiones</b>
          <ol>
            <li>Pide por separado habitaciones, inventario, consumo, clientes y reservas.</li>
            <li>Descarga las listas completas.</li>
            <li>Combina los datos él mismo.</li>
          </ol>
        </button>
      </div>

      <div className="field-row">
        <div className="fld">
          <label className="lbl" htmlFor="lab-rtt">Latencia simulada por petición</label>
          <select id="lab-rtt" className="inp" value={rtt} onChange={(e) => onRtt(Number(e.target.value))}>
            {RTT_OPTIONS.map((v) => (
              <option key={v} value={v}>{v === 0 ? "Ninguna (red local)" : `${v} ms (como internet)`}</option>
            ))}
          </select>
        </div>
        <div className="muted sm-text" style={{ alignSelf: "end", maxWidth: 420 }}>
          En tu computador la red es casi instantánea. Con latencia se nota lo que cuesta cada viaje extra.
        </div>
      </div>

      <div className="lab-stats" aria-live="polite">
        <div className="lab-stat">
          <span className="overline">Peticiones</span>
          <span className="amt-lg">{result ? result.requests : "—"}</span>
          <span className="muted sm-text">{mode === "facade" ? "Una sola" : "Una por recurso"}</span>
        </div>
        <div className="lab-stat">
          <span className="overline">Tiempo total</span>
          <span className="amt-lg">{result ? fmtMs(result.ms) : "—"}</span>
          <span className="muted sm-text">{rtt ? `con ${rtt} ms de latencia por viaje` : "sin latencia simulada"}</span>
        </div>
        <div className="lab-stat">
          <span className="overline">Datos descargados</span>
          <span className="amt-lg">{result ? kb(result.bytes) : "—"}</span>
          <span className="muted sm-text">{mode === "facade" ? "Solo el resumen" : "Las listas completas"}</span>
        </div>
        <div className="lab-stat">
          <span className="overline">El navegador conoce</span>
          <span className="amt-lg">{mode === "facade" ? "1 ruta" : "5 rutas"}</span>
          <span className="muted sm-text">{mode === "facade" ? "El gateway oculta los servicios" : "Y combina los datos él mismo"}</span>
        </div>
      </div>

      <Flow mode={mode} result={result} />

      {result && (
        <div>
          <div className="overline" style={{ marginBottom: 10 }}>Qué pasó en la red (cada barra es una petición)</div>
          <Waterfall result={result} />
        </div>
      )}

      <div className="bench">
        <div className="lab-top">
          <div>
            <h3 className="h3">Comparar los dos modos</h3>
            <div className="muted sm-text">
              Pide el Panel {n} veces con cada modo (alternados) y promedia el tiempo. Así el resultado no depende de una sola prueba.
            </div>
          </div>
          <div className="field-row">
            <div className="fld">
              <label className="lbl" htmlFor="lab-n">Repeticiones</label>
              <select id="lab-n" className="inp" value={n} onChange={(e) => setN(Number(e.target.value))} disabled={!!running}>
                {[10, 20, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <button className={"btn primary" + (running ? " busy" : "")} onClick={run} disabled={!!running}>
              {running ? <span className="spin" aria-hidden="true" /> : <Icon name="bolt" />}
              {running ? "Midiendo…" : "Comparar"}
            </button>
          </div>
        </div>

        {running && (
          <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={running.total} aria-valuenow={running.done}>
            <i style={{ width: `${(running.done / running.total) * 100}%` }} />
          </div>
        )}
        {benchError && <div className="note-box t-err"><Icon name="alert" /><span>{benchError}</span></div>}

        {bench && (
          <>
            <BenchRow title="Con Facade" sub="1 viaje al gateway" mode={bench.facade} tone="facade" max={max} />
            <BenchRow title="Sin Facade" sub="5 viajes en paralelo" mode={bench.directo} tone="directo" max={max} />
            <div className="note-box t-info">
              <Icon name="info" />
              <span>
                Con {num(bench.n)} repeticiones{bench.rtt ? ` y ${bench.rtt} ms de latencia por petición` : ""}, la Facade tardó{" "}
                <b>{fmtMs(bench.facade.stats.media)}</b> y sin Facade <b>{fmtMs(bench.directo.stats.media)}</b>:{" "}
                <b>{(bench.directo.stats.media / bench.facade.stats.media).toFixed(1)}×</b> {bench.directo.stats.media >= bench.facade.stats.media ? "más rápida" : "más lenta"}.
                Además descargó <b>{bench.facade.bytes > 0 ? Math.round(bench.directo.bytes / bench.facade.bytes).toLocaleString("es-CO") : "—"}×</b> menos datos
                ({kb(bench.facade.bytes)} frente a {kb(bench.directo.bytes)}).
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
