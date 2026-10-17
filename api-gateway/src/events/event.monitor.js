const { broker } = require("../broker/broker.facade");

const MAX_EVENTS = 200;

/**
 * Monitor de eventos: escucha TODO lo que circula por el exchange (routing key "#") y guarda los
 * últimos 200 en memoria. Lo usa la vista "Patrones" del Frontend para mostrar, en vivo, los
 * eventos que publican los microservicios a través de su BrokerFacade.
 * Usa la misma fachada: connect() + subscribe(), sin tocar amqplib.
 */
const events = [];
let nextId = 1;

async function start() {
  try {
    await broker.connect();
    await broker.subscribe({
      queue: "gateway.event_monitor",
      routingKeys: ["#"],
      handler: async (message, routingKey) => {
        events.push({
          id: nextId++,
          routingKey,
          event: message.event,
          timestamp: message.timestamp,
          receivedAt: new Date().toISOString(),
          data: message.data
        });
        if (events.length > MAX_EVENTS) events.shift();
      }
    });
  } catch (error) {
    console.error("[GATEWAY] El monitor de eventos no pudo iniciar:", error.message);
  }
}

function list(afterId = 0) {
  return { connected: broker.connected, events: events.filter((e) => e.id > afterId).slice(-100) };
}

module.exports = { start, list };
