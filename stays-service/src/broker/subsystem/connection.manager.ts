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

    const newConnection = await this.connectWithRetry(url);
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

  // RabbitMQ puede aceptar el "ping" del healthcheck y aun así tardar unos segundos en abrir
  // el puerto AMQP; sin reintentos el servicio moría al arrancar y quedaba apagado.
  private async connectWithRetry(url: string, attempts = 30, delayMs = 2000): Promise<ChannelModel> {
    for (let i = 1; ; i++) {
      try {
        return await amqp.connect(url);
      } catch (error) {
        if (i >= attempts) throw error;
        console.warn(`[${this.serviceName}][RabbitMQ] No disponible (intento ${i}/${attempts}), reintento en ${delayMs / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ no está conectado");
    }

    return this.channel;
  }
}
