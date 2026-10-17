import { useEffect, useRef, useState } from "react";
import { errMsg, ms as fmtMs } from "../../lib/format";
import {
  createAndDeleteTestClient,
  getEvents,
  publishDemo,
  type BrokerEvent,
  type DemoResult,
} from "../../services/eventsService";
import Icon from "../../ui/Icon";

const WITHOUT = `const connection = await amqp.connect(url);
const channel = await connection.createChannel();
await channel.assertExchange(exchange, "topic", { durable: true });
const message = { event, timestamp: new Date().toISOString(), data };
channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)),
  { persistent: true, contentType: "application/json" });
await channel.close();
await connection.close();`;

const WITH = `broker.publish("client.created", "CLIENT_CREATED", data);`;

const hour = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const preview = (data: unknown) => {
  const text = JSON.stringify(data);
  return text.length > 110 ? text.slice(0, 110) + "…" : text;
};

function Steps({ result }: { result: DemoResult }) {
  const max = Math.max(...result.steps.map((s) => s.ms), 1e-9);
  return (
    <div className="steps">
      <div className="overline">
        {result.mode === "facade" ? "Con Facade" : "Sin Facade"} · {result.steps.length} {result.steps.length === 1 ? "paso" : "pasos"} · {fmtMs(result.totalMs)} en total
      </div>
      {result.steps.map((s, i) => (
        <div key={i} className="step-row">
          <code>{s.name}</code>
          <div className="bench-track"><div className={"bench-bar" + (result.mode === "facade" ? " is-facade" : "")} style={{ width: `${Math.max(2, (s.ms / max) * 100)}%` }} /></div>
          <span className="val">{fmtMs(s.ms)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BrokerPanel() {
  const [events, setEvents] = useState<BrokerEvent[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [demo, setDemo] = useState<DemoResult | null>(null);
  const [fresh, setFresh] = useState(-1); // los eventos con id mayor son los que acaban de llegar
  const lastId = useRef(0);

  // Consulta al gateway cada 1,5 s y agrega solo lo nuevo.
  useEffect(() => {
    let alive = true;

    const poll = async () => {
      try {
        const res = await getEvents(lastId.current);
        if (!alive) return;
        setConnected(res.connected);
        setError("");
        if (res.events.length > 0) {
          lastId.current = res.events[res.events.length - 1].id;
          setEvents((prev) => [...res.events, ...prev].sort((x, y) => y.id - x.id).slice(0, 60));
        }
      } catch (e) {
        if (alive) setError(errMsg(e, "No se pudo leer el monitor de eventos"));
      }
    };

    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const run = async (key: string, action: () => Promise<DemoResult | void>) => {
    setBusy(key);
    setError("");
    setFresh(lastId.current);
    try {
      const result = await action();
      if (result) setDemo(result);
    } catch (e) {
      setError(errMsg(e, "No se pudo completar la acción"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack">
      <section className="card lab rise" aria-label="Facade del broker">
        <div className="lab-top">
          <div>
            <h3 className="h3">Facade del broker: hablar con RabbitMQ sin complicarse</h3>
            <div className="muted sm-text">
              Cada microservicio publica eventos (cliente creado, stock cambiado, reserva confirmada…) para que los demás se enteren.
              Hacerlo con RabbitMQ exige varios pasos; el <b>BrokerFacade</b> (<code>src/broker/broker.facade.ts</code> en cada servicio) los esconde detrás de <code>connect</code>, <code>publish</code> y <code>subscribe</code>.
            </div>
          </div>
          <span className={"chip"}><span className="dot" />{connected === null ? "conectando…" : connected ? "RabbitMQ conectado" : "RabbitMQ sin conexión"}</span>
        </div>

        <div className="mode-cards">
          <div className="mode-card is-direct on">
            <span className="mc-tag">Sin Facade</span>
            <b>7 líneas en cada lugar que publique</b>
            <pre className="code">{WITHOUT}</pre>
          </div>
          <div className="mode-card is-facade on">
            <span className="mc-tag">Con Facade</span>
            <b>1 línea</b>
            <pre className="code">{WITH}</pre>
            <div className="muted sm-text">
              La conexión, el canal y el exchange ya los dejó listos <code>ConnectionManager</code> al arrancar el servicio. <code>EventPublisher</code> arma el sobre y lo envía.
            </div>
          </div>
        </div>
      </section>

      <section className="card lab rise" aria-label="Probar el broker">
        <div>
          <h3 className="h3">Pruébalo</h3>
          <div className="muted sm-text">
            Publica el mismo evento de las dos formas y mira los pasos y los milisegundos. Abajo aparece el evento tal como llegó a RabbitMQ.
          </div>
        </div>

        <div className="btn-row">
          <button className={"btn primary" + (busy === "facade" ? " busy" : "")} disabled={!!busy} onClick={() => run("facade", () => publishDemo("facade"))}>
            {busy === "facade" ? <span className="spin" aria-hidden="true" /> : <Icon name="bolt" />}
            Publicar con Facade
          </button>
          <button className={"btn ghost" + (busy === "directo" ? " busy" : "")} disabled={!!busy} onClick={() => run("directo", () => publishDemo("directo"))}>
            {busy === "directo" ? <span className="spin" aria-hidden="true" /> : <Icon name="bolt" />}
            Publicar sin Facade
          </button>
          <button className={"btn ghost" + (busy === "real" ? " busy" : "")} disabled={!!busy} onClick={() => run("real", createAndDeleteTestClient)}>
            {busy === "real" ? <span className="spin" aria-hidden="true" /> : <Icon name="clients" />}
            Evento real: crear y borrar un cliente
          </button>
        </div>
        <div className="muted sm-text">
          El tercer botón usa <code>clients-service</code> de verdad: crea un cliente y lo elimina, y el servicio publica <code>client.created</code> y <code>client.deleted</code> con su propio BrokerFacade.
        </div>

        {error && <div className="note-box t-err"><Icon name="alert" /><span>{error}</span></div>}
        {demo && <Steps result={demo} />}
      </section>

      <section className="card lab rise" aria-label="Eventos en vivo">
        <div className="lab-top">
          <div>
            <h3 className="h3">Eventos en vivo</h3>
            <div className="muted sm-text">
              Todo lo que pasa por el exchange <code>hotel_events</code>. Hay también eventos de los servicios mientras los usas (inicio de sesión, reservas, stock…).
            </div>
          </div>
          <button className="btn ghost sm" onClick={() => { setEvents([]); }}>Limpiar la lista</button>
        </div>

        {events.length === 0 ? (
          <div className="empty">Todavía no llegó ningún evento. Usa uno de los botones de arriba.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl-simple">
              <thead>
                <tr><th>Hora</th><th>Routing key</th><th>Evento</th><th>Datos</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className={fresh >= 0 && e.id > fresh ? "row-new" : ""}>
                    <td className="nowrap">{hour(e.receivedAt)}</td>
                    <td><code>{e.routingKey}</code></td>
                    <td>{e.event}</td>
                    <td className="muted"><code>{preview(e.data)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
