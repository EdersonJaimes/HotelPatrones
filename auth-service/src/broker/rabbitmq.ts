import amqp, { Channel, ChannelModel } from "amqplib";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  const exchange = process.env.RABBITMQ_EXCHANGE;

  if (!url || !exchange) {
    throw new Error("RABBITMQ_URL o RABBITMQ_EXCHANGE no están configuradas");
  }

  const newConnection = await amqp.connect(url);
  const newChannel = await newConnection.createChannel();

  await newChannel.assertExchange(exchange, "topic", { durable: true });

  newConnection.on("error", (error) => {
    console.error("[AUTH][RabbitMQ] Error de conexión:", error.message);
  });

  newConnection.on("close", () => {
    console.warn("[AUTH][RabbitMQ] Conexión cerrada");
    connection = null;
    channel = null;
  });

  
  connection = newConnection;
  channel = newChannel;

  console.log("[AUTH] RabbitMQ conectado");
}

export function getRabbitChannel(): Channel {
  if (!channel) {
    throw new Error("RabbitMQ no está conectado");
  }

  return channel;
}
