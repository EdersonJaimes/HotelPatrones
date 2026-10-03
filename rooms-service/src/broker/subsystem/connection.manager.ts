import amqp, { Channel, ChannelModel } from "amqplib";

/**
 * SUBSISTEMA (1/3) - Conexión.
 * Se encarga de conectar con RabbitMQ, crear el canal y declarar el exchange.
 * No sabe que existe una Fachada: solo hace su trabajo.
 */
export class ConnectionManager {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly serviceName: string) {}

  get exchange(): string {
    return process.env.RABBITMQ_EXCHANGE as string;
  }

  async connect(): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    const exchange = process.env.RABBITMQ_EXCHANGE;

    if (!url || !exchange) {
      throw new Error("RABBITMQ_URL o RABBITMQ_EXCHANGE no están configuradas");
    }

    const newConnection = await amqp.connect(url);
    const newChannel = await newConnection.createChannel();

    await newChannel.assertExchange(exchange, "topic", { durable: true });

    newConnection.on("error", (error) => {
      console.error(`[${this.serviceName}][RabbitMQ] Error de conexión:`, error.message);
    });

    newConnection.on("close", () => {
      console.warn(`[${this.serviceName}][RabbitMQ] Conexión cerrada`);
      this.connection = null;
      this.channel = null;
    });

    this.connection = newConnection;
    this.channel = newChannel;

    console.log(`[${this.serviceName}] RabbitMQ conectado`);
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ no está conectado");
    }

    return this.channel;
  }
}
