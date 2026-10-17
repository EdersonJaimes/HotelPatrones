const amqp = require("amqplib");
const { broker } = require("../broker/broker.facade");

const now = () => Number(process.hrtime.bigint()) / 1e6;

/**
 * Publica el MISMO evento de demostración de dos formas, para ver qué cambia:
 *
 *  · CON Facade: broker.publish(...) — una línea; la fachada ya tiene la conexión abierta y sabe
 *    armar y serializar el mensaje.
 *  · SIN Facade: el código que habría que repetir en cada lugar que publique un evento: abrir
 *    conexión, crear canal, declarar el exchange, armar el sobre, pasarlo a Buffer, publicar y
 *    cerrar. Es código ingenuo (conecta en cada envío), tal como queda cuando cada módulo lo escribe a mano.
 */
function withFacade(data) {
  const t0 = now();
  broker.publish("demo.ping", "DEMO_PING", data);
  const ms = now() - t0;

  return { steps: [{ name: "broker.publish(\"demo.ping\", \"DEMO_PING\", data)", ms }], totalMs: ms };
}

async function withoutFacade(data) {
  const url = process.env.RABBITMQ_URL || "amqp://127.0.0.1:5672";
  const exchange = process.env.RABBITMQ_EXCHANGE || "hotel_events";
  const steps = [];
  const total0 = now();

  const timed = async (name, run) => {
    const t0 = now();
    const value = await run();
    steps.push({ name, ms: now() - t0 });
    return value;
  };

  const connection = await timed("amqp.connect(url)", () => amqp.connect(url));

  try {
    const channel = await timed("connection.createChannel()", () => connection.createChannel());
    await timed("channel.assertExchange(exchange, \"topic\", { durable: true })", () =>
      channel.assertExchange(exchange, "topic", { durable: true })
    );

    await timed("JSON.stringify + Buffer.from + channel.publish(...)", async () => {
      const message = { event: "DEMO_PING", timestamp: new Date().toISOString(), data };
      channel.publish(exchange, "demo.ping", Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: "application/json"
      });
    });

    await timed("channel.close()", () => channel.close());
  } finally {
    await timed("connection.close()", () => connection.close());
  }

  return { steps, totalMs: now() - total0 };
}

module.exports = { withFacade, withoutFacade };
