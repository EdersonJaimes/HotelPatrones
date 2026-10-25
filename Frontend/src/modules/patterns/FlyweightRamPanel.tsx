import { useState } from "react";
import { buildFly, buildPlain, estimateFly, estimatePlain, type RawMovement } from "../../lib/flyweight";
import { kb, num } from "../../lib/format";
import {
  buildReservations,
  estimateFlyReservations,
  estimatePlainReservations,
  type RawReservation,
} from "../../lib/reservationFlyweight";
import api from "../../services/api";
import Icon from "../../ui/Icon";
import { Compare } from "./FlyweightPanel";

// Análisis de RAM previo a implementar Flyweight, medido con los 20 056 registros del seed
// (docs/presentacion/seed-20000.js). Servicio: documentos Mongoose + transformación + res.json().
// Navegador: la respuesta real tras JSON.parse. Repetido: parte del estado del navegador que son copias.
const PROCESSES = [
  { module: "reservations-service", fn: "listReservations()", screen: "Reservas · historial del cliente", rows: 4500, service: 23.7, browser: 3.2, repeated: 44, fly: "crítico" },
  { module: "products-service", fn: "getRecentMovements() · kardex completo", screen: "Inventario → Kardex", rows: 6330, service: 10.0, browser: 1.9, repeated: 51, fly: "crece" },
  { module: "clients-service", fn: "listClients()", screen: "Clientes", rows: 8000, service: 8.0, browser: 2.4, repeated: 16 },
  { module: "products-service", fn: "listInventory()", screen: "Inventario (stock)", rows: 1200, service: 1.6, browser: 0.25, repeated: 18 },
  { module: "products-service", fn: "listProducts()", screen: "Productos · Inventario · Recepción", rows: 1200, service: 1.3, browser: 0.3, repeated: 9 },
  { module: "stays-service", fn: "listStays()", screen: "Recepción", rows: 230, service: 0.75, browser: 0.16, repeated: 18 },
  { module: "products-service", fn: "getRecentMovements(300)", screen: "Inventario → Kardex (uso actual)", rows: 300, service: 0.48, browser: 0.09, repeated: 19 },
  { module: "rooms-service", fn: "listRooms()", screen: "Habitaciones · Recepción · Reservas", rows: 120, service: 0.36, browser: 0.04, repeated: 41 },
  { module: "auth-service", fn: "listUsers()", screen: "Usuarios", rows: 7, service: 0.01, browser: 0.001, repeated: 13 },
];

interface ServerMemory {
  rows: number;
  before: number;
  leanOnly: number;
  after: number;
  shared: Record<string, number>;
}

interface Measured {
  name: string;
  detail: string;
  server: ServerMemory;
  sharedLabel: string;
  browser: { before: number; after: number };
}

const pct = (before: number, after: number) => `${Math.round((1 - after / Math.max(before, 1)) * 100)} %`;
const mb = (n: number) => (n >= 1 ? `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB` : `${Math.round(n * 1024)} KB`);

async function measure(): Promise<Measured[]> {
  const [resMem, karMem, reservations, movements] = await Promise.all([
    api.get<ServerMemory>("/reservations/flyweight/memory"),
    api.get<ServerMemory>("/inventory/flyweight/memory", { params: { limit: 20000 } }),
    api.get<RawReservation[]>("/reservations"),
    api.get<RawMovement[]>("/inventory/movements", { params: { limit: 20000 } }),
  ]);

  const r = resMem.data.shared;
  const k = karMem.data.shared;
  return [
    {
      name: "Reservas",
      detail: "reservations-service → listReservations()",
      server: resMem.data,
      sharedLabel: `${num(r.rooms)} habitaciones + ${r.channels} canales + ${r.statuses} estados + ${r.creators} creador`,
      browser: {
        before: estimatePlainReservations(reservations.data),
        after: estimateFlyReservations(buildReservations(reservations.data)),
      },
    },
    {
      name: "Kardex",
      detail: "products-service → getRecentMovements()",
      server: karMem.data,
      sharedLabel: `${num(k.products)} productos + ${k.types} tipos`,
      browser: {
        before: estimatePlain(buildPlain(movements.data)),
        after: estimateFly(buildFly(movements.data)),
      },
    },
  ];
}

function Result({ m }: { m: Measured }) {
  const { before, leanOnly, after, rows } = m.server;
  const fromLean = before - leanOnly;
  const fromFly = leanOnly - after;

  return (
    <section className="card lab rise" aria-label={`Antes y después en ${m.name}`}>
      <div className="lab-top">
        <div>
          <h3 className="h3">{m.name}: antes y después del Flyweight</h3>
          <div className="muted sm-text">{m.detail} · {num(rows)} filas reales de la base</div>
        </div>
      </div>

      <div className="lab-stats" aria-live="polite">
        <div className="lab-stat">
          <span className="overline">RAM en el servicio</span>
          <span className="amt-lg">{pct(before, after)} menos</span>
          <span className="muted sm-text">{kb(before)} → {kb(after)} (heap real)</span>
        </div>
        <div className="lab-stat">
          <span className="overline">RAM en el navegador</span>
          <span className="amt-lg">{pct(m.browser.before, m.browser.after)} menos</span>
          <span className="muted sm-text">{kb(m.browser.before)} → {kb(m.browser.after)} (estimada)</span>
        </div>
        <div className="lab-stat">
          <span className="overline">Objetos compartidos</span>
          <span className="amt-lg">{num(Object.values(m.server.shared).reduce((s, n) => s + n, 0))}</span>
          <span className="muted sm-text">{m.sharedLabel}</span>
        </div>
      </div>

      <Compare
        title="Servicio: RAM por petición"
        sub="Heap de V8 retenido dentro del contenedor por la respuesta armada + el JSON de res.json()"
        a={before}
        b={after}
        fmtV={(n) => kb(n)}
      />
      <Compare
        title="Navegador: RAM de la lista en pantalla"
        sub="Las filas que guarda la pantalla después de recibir la respuesta"
        a={m.browser.before}
        b={m.browser.after}
        fmtV={(n) => kb(n)}
      />
      <div className="note-box t-info">
        <Icon name="info" />
        <span>
          En el servicio, {kb(Math.max(0, fromLean))} se ahorran por leer objetos planos (<code>.lean()</code>) en vez de documentos Mongoose, que es lo que deja
          a cada fila solo con su estado extrínseco, y {kb(Math.max(0, fromFly))} por compartir los flyweights. La memoria del navegador es la misma estimación
          del laboratorio del kardex (no el heap real de la pestaña).
        </span>
      </div>
    </section>
  );
}

export default function FlyweightRamPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Measured[] | null>(null);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setData(await measure());
    } catch {
      setError("No se pudo medir. Revisa que el api-gateway, reservations-service y products-service estén encendidos y que entraste como administrador.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="card lab rise" aria-label="Uso de RAM por proceso">
        <div className="lab-top">
          <div>
            <h3 className="h3">Uso de RAM por proceso, antes de Flyweight</h3>
            <div className="muted sm-text">
              Análisis con los 20 056 registros del seed para decidir dónde aplicar el patrón: Flyweight solo ayuda donde hay mucha RAM <b>y</b> mucho dato repetido.
            </div>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl-simple">
            <thead>
              <tr>
                <th>#</th><th>Módulo → función</th><th>Pantalla</th><th className="num">Filas</th>
                <th className="num">RAM servicio</th><th className="num">RAM navegador</th><th className="num">% repetido</th><th>Flyweight</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSES.map((p, i) => (
                <tr key={p.fn}>
                  <td className="muted">{i + 1}</td>
                  <td><span className="muted sm-text">{p.module}</span><br /><code className="strong">{p.fn}</code></td>
                  <td className="sm-text">{p.screen}</td>
                  <td className="num">{num(p.rows)}</td>
                  <td className="num strong">{mb(p.service)}</td>
                  <td className="num">{mb(p.browser)}</td>
                  <td className="num">{p.repeated} %</td>
                  <td>
                    {p.fly === "crítico" && <span className="badge t-err">Proceso crítico</span>}
                    {p.fly === "crece" && <span className="badge t-warn">Crece sin tope</span>}
                    {!p.fly && <span className="muted sm-text">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="muted sm-text">
          RAM servicio: pico de una petición (documentos Mongoose + transformación + JSON). Clientes usa mucha RAM pero casi no repite datos: ahí conviene paginar, no Flyweight.
        </div>
      </section>

      <section className="card lab rise" aria-label="Medir antes y después">
        <div className="lab-top">
          <div>
            <h3 className="h3">Antes y después, con los datos reales</h3>
            <div className="muted sm-text">
              Cada servicio arma su respuesta de las dos formas con lo que hay hoy en la base y mide la RAM dentro de su propio proceso.
            </div>
          </div>
          <button className={"btn primary" + (busy ? " busy" : "")} onClick={run} disabled={busy}>
            {busy ? <span className="spin" aria-hidden="true" /> : <Icon name="bolt" />}
            {busy ? "Midiendo…" : data ? "Volver a medir" : "Medir ahora"}
          </button>
        </div>
        {error && <div className="note-box t-err"><Icon name="alert" /><span>{error}</span></div>}
        {!data && !error && <div className="empty">Pulsa «Medir ahora» para comparar reservas y kardex sin y con Flyweight.</div>}
      </section>

      {data?.map((m) => <Result key={m.name} m={m} />)}

      {data && (
        <div className="muted sm-text">
          Las cifras de «antes» medidas aquí no son idénticas a las de la tabla: la tabla se midió fuera de los servicios y suma el pico de toda la petición; aquí
          se mide lo que retiene la respuesta dentro del contenedor. La proporción del ahorro es lo que se compara.
        </div>
      )}
    </div>
  );
}
