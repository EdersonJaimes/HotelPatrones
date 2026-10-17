const amqp = require("amqplib");

/**
 * SUBSISTEMA (1/3) - Conexión.
 * Conecta con RabbitMQ (con reintentos), crea el canal y declara el exchange.
 * No sabe que existe una Fachada: solo hace su trabajo.
 */
class ConnectionManager {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.url = options.url || process.env.RABBITMQ_URL || "amqp://127.0.0.1:5672";
    this.exchange = options.exchange || process.env.RABBITMQ_EXCHANGE || "hotel_events";
    this.connection = null;
    this.channel = null;
  }

  async connect(attempts = 30, delayMs = 2000) {
    for (let i = 1; ; i++) {
      try {
        this.connection = await amqp.connect(this.url);
        break;
      } catch (error) {
        if (i >= attempts) throw error;
        console.warn(`[${this.serviceName}][RabbitMQ] No disponible (intento ${i}/${attempts}), reintento en ${delayMs / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, "topic", { durable: true });

    this.connection.on("error", (error) => {
      console.error(`[${this.serviceName}][RabbitMQ] Error de conexión:`, error.message);
    });

    this.connection.on("close", () => {
      console.warn(`[${this.serviceName}][RabbitMQ] Conexión cerrada`);
      this.connection = null;
      this.channel = null;
    });

    console.log(`[${this.serviceName}] RabbitMQ conectado`);
  }

  get connected() {
    return this.channel !== null;
  }

  getChannel() {
    if (!this.channel) {
      throw new Error("RabbitMQ no está conectado");
    }

    return this.channel;
  }
}

module.exports = { ConnectionManager };
