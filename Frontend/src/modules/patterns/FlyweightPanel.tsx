import { useState } from "react";
import { kb, ms as fmtMs, num } from "../../lib/format";
import {
  buildFly,
  buildPlain,
  estimateFly,
  estimatePlain,
  searchFly,
  searchPlain,
  type FlyRow,
  type FlyStore,
  type PlainRow,
  type RawMovement,
} from "../../lib/flyweight";
import api from "../../services/api";
import Icon from "../../ui/Icon";

const SIZES = [1000, 3000, 6000];
const REPEATS = 40; // una búsqueda tarda microsegundos: se repite y se promedia para poder verla en ms

interface Loaded {
  total: number;
  download: { ms: number; bytes: number };
  plain: { rows: PlainRow[]; ms: number; bytes: number };
  fly: { store: FlyStore; ms: number; bytes: number };
}

interface Found {
  q: string;
  plain: { ms: number; matches: number };
  fly: { ms: number; matches: number; compared: number };
  sample: FlyRow[];
}

function time<T>(run: () => T, repeats = 1): { ms: number; value: T } {
  let value = run();
  const t0 = performance.now();
  for (let i = 0; i < repeats; i++) value = run();
  return { ms: (performance.now() - t0) / repeats, value };
}

function Compare({ title, sub, a, b, fmtV, unit }: { title: string; sub: string; a: number; b: number; fmtV: (n: number) => string; unit?: string }) {
  const max = Math.max(a, b, 1e-9) * 1.05;
  return (
    <div className="fw-cmp">
      <div className="lbl2">{title}</div>
      <div className="sub">{sub}</div>
      <div className="bench-row">
        <div className="sub strong">Sin Flyweight</div>
        <div className="bench-track"><div className="bench-bar" style={{ width: `${(a / max) * 100}%` }} /></div>
        <div className="val">{fmtV(a)}{unit}</div>
      </div>
      <div className="bench-row">
        <div className="sub strong">Con Flyweight</div>
        <div className="bench-track"><div className="bench-bar is-facade" style={{ width: `${(b / max) * 100}%` }} /></div>
        <div className="val">{fmtV(b)}{unit}</div>
      </div>
    </div>
  );
}

export default function FlyweightPanel() {
  const [size, setSize] = useState(6000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Loaded | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found | null>(null);

  const load = async () => {
    setBusy(true);
    setError("");
    setFound(null);
    setQ("");
    try {
      const t0 = performance.now();
      const res = await api.get<RawMovement[]>("/inventory/movements", { params: { limit: size } });
      const raw = res.data;
      const download = { ms: performance.now() - t0, bytes: JSON.stringify(raw).length };

      const plain = time(() => buildPlain(raw));
      const fly = time(() => buildFly(raw));

      setData({
        total: raw.length,
        download,
        plain: { rows: plain.value, ms: plain.ms, bytes: estimatePlain(plain.value) },
        fly: { store: fly.value, ms: fly.ms, bytes: estimateFly(fly.value) },
      });
    } catch {
      setError("No se pudo leer el kardex. Revisa que el api-gateway y products-service estén encendidos.");
    } finally {
      setBusy(false);
    }
  };

  const search = (value: string) => {
    setQ(value);
    const key = value.trim().toLowerCase();
    if (!data || !key) {
      setFound(null);
      return;
    }
    const a = time(() => searchPlain(data.plain.rows, key), REPEATS);
    const b = time(() => searchFly(data.fly.store, key), REPEATS);
    setFound({
      q: key,
      plain: { ms: a.ms, matches: a.value.length },
      fly: { ms: b.ms, matches: b.value.length, compared: data.fly.store.products.size },
      sample: b.value.slice(0, 10),
    });
  };

  const shared = data ? data.fly.store.products.size + data.fly.store.types.size : 0;
  const saved = data ? 1 - data.fly.bytes / data.plain.bytes : 0;

  return (
    <div className="stack">
      <section className="card lab rise" aria-label="Laboratorio Flyweight">
        <div className="lab-top">
          <div>
            <h3 className="h3">Flyweight: compartir lo que se repite</h3>
            <div className="muted sm-text">
              El kardex tiene miles de movimientos, pero solo unos cientos de productos distintos. Mira qué pasa en memoria y en las búsquedas si cada fila guarda su copia o si todas comparten el mismo objeto.
            </div>
          </div>
        </div>

        <div className="mode-cards">
          <div className="mode-card is-direct on">
            <span className="mc-tag">Sin Flyweight</span>
            <b>Cada fila guarda todo</b>
            <ol>
              <li>Cada movimiento trae su propia copia del nombre del producto.</li>
              <li>También de la descripción de «Entrada» / «Salida».</li>
              <li>Para buscar hay que revisar el texto de cada fila.</li>
            </ol>
          </div>
          <div className="mode-card is-facade on">
            <span className="mc-tag">Con Flyweight</span>
            <b>Las filas comparten objetos</b>
            <ol>
              <li>Una fábrica crea cada producto y cada tipo una sola vez.</li>
              <li>La fila solo guarda lo suyo: cantidad, motivo y fecha.</li>
              <li>Para buscar se revisan los productos únicos, no todas las filas.</li>
            </ol>
          </div>
        </div>

        <div className="field-row">
          <div className="fld">
            <label className="lbl" htmlFor="fw-n">Movimientos del kardex a cargar</label>
            <select id="fw-n" className="inp" value={size} onChange={(e) => setSize(Number(e.target.value))} disabled={busy}>
              {SIZES.map((v) => <option key={v} value={v}>{num(v)}</option>)}
            </select>
          </div>
          <button className={"btn primary" + (busy ? " busy" : "")} onClick={load} disabled={busy}>
            {busy ? <span className="spin" aria-hidden="true" /> : <Icon name="bolt" />}
            {busy ? "Cargando…" : data ? "Volver a cargar" : "Cargar y comparar"}
          </button>
        </div>
        {error && <div className="note-box t-err"><Icon name="alert" /><span>{error}</span></div>}
      </section>

      {data && (
        <>
          <section className="card lab rise" aria-label="Resultado en memoria">
            <div className="lab-stats" aria-live="polite">
              <div className="lab-stat">
                <span className="overline">Filas cargadas</span>
                <span className="amt-lg">{num(data.total)}</span>
                <span className="muted sm-text">{fmtMs(data.download.ms)} · {kb(data.download.bytes)} desde el servidor</span>
              </div>
              <div className="lab-stat">
                <span className="overline">Copias del producto</span>
                <span className="amt-lg">{num(data.total)} → {num(data.fly.store.products.size)}</span>
                <span className="muted sm-text">sin → con Flyweight</span>
              </div>
              <div className="lab-stat">
                <span className="overline">Objetos compartidos</span>
                <span className="amt-lg">{num(shared)}</span>
                <span className="muted sm-text">{num(data.fly.store.products.size)} productos + {data.fly.store.types.size} tipos</span>
              </div>
              <div className="lab-stat">
                <span className="overline">Memoria que se ahorra</span>
                <span className="amt-lg">{Math.round(saved * 100)} %</span>
                <span className="muted sm-text">{kb(data.plain.bytes)} → {kb(data.fly.bytes)} (estimada)</span>
              </div>
            </div>

            <Compare title="Memoria estimada" sub="Lo que ocupan las filas ya armadas en el navegador" a={data.plain.bytes} b={data.fly.bytes} fmtV={(n) => kb(n)} />
            <Compare title="Tiempo de construir las filas" sub="Armar la lista una vez, con los mismos datos" a={data.plain.ms} b={data.fly.ms} fmtV={(n) => fmtMs(n)} />
            <div className="note-box t-info">
              <Icon name="info" />
              <span>
                La memoria es una estimación (cadenas a 2 bytes por carácter más cabeceras), no el heap real del navegador, pero sigue la misma proporción:
                sin Flyweight hay {num(data.total)} copias de cada dato repetido; con Flyweight, {num(data.fly.store.products.size)}.
              </span>
            </div>
          </section>

          <section className="card lab rise" aria-label="Búsqueda">
            <div className="lab-top">
              <div>
                <h3 className="h3">Buscar un producto en el kardex</h3>
                <div className="muted sm-text">Escribe parte del nombre (por ejemplo «agua» o «coco») y compara cuánto tarda cada forma. Cada búsqueda se repite {REPEATS} veces y se promedia.</div>
              </div>
              <label className="search" style={{ minWidth: 260 }}>
                <Icon name="search" />
                <span className="sr">Buscar producto</span>
                <input type="search" placeholder="Nombre del producto" value={q} onChange={(e) => search(e.target.value)} />
              </label>
            </div>

            {!found && <div className="empty">Escribe algo para medir la búsqueda con los dos modelos.</div>}

            {found && (
              <>
                <Compare
                  title={`«${found.q}» · ${num(found.fly.matches)} movimientos`}
                  sub={`Sin Flyweight revisa ${num(data.total)} textos · con Flyweight revisa ${num(found.fly.compared)} productos`}
                  a={found.plain.ms}
                  b={found.fly.ms}
                  fmtV={(n) => (n < 0.01 ? "<0,01 ms" : fmtMs(n))}
                />
                {found.plain.matches !== found.fly.matches && (
                  <div className="note-box t-err"><Icon name="alert" /><span>Los dos modelos deberían dar el mismo resultado.</span></div>
                )}
                <div className="tbl-wrap">
                  <table className="tbl-simple">
                    <thead>
                      <tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Objeto compartido</th></tr>
                    </thead>
                    <tbody>
                      {found.sample.map((r) => (
                        <tr key={r.id}>
                          <td className="strong">{r.product.name}</td>
                          <td>{r.type.label}</td>
                          <td className="num">{r.type.sign}{num(r.quantity)}</td>
                          <td>{r.reason}</td>
                          <td className="muted">usado por {num(data.fly.store.products.usesOf(r.product))} filas</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="muted sm-text">Se muestran las primeras {found.sample.length} de {num(found.fly.matches)} filas. La columna de la derecha cuenta cuántas filas apuntan al mismo producto.</div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
