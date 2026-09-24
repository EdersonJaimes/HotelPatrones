import { ConsumeMessage } from "amqplib";
import { getRabbitChannel } from "./rabbitmq";
import { RoomSnapshotRepository } from "../repositories/roomSnapshot.repository";

const QUEUE_NAME = "reservations.room_sync";
const ROOM_ROUTING_KEYS = ["room.created", "room.updated", "room.status_changed", "room.deleted"];

interface RoomEventMessage {
  event: string;
  data: {
    roomId: string;
    number: number;
    type?: string;
    price?: number;
    capacity?: number;
    status?: string;
  };
}

const roomSnapshotRepository = new RoomSnapshotRepository();

/**
 * Puente RabbitMQ: reservations-service mantiene un read-model local de las
 * habitaciones (RoomSnapshot) escuchando los eventos que ya publica
 * rooms-service, en vez de depender de una llamada HTTP síncrona para
 * validar habitación/precio/capacidad al crear una reserva.
 */
export async function startRoomSyncConsumer(): Promise<void> {
  const exchange = process.env.RABBITMQ_EXCHANGE as string;
  const channel = getRabbitChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });

  for (const routingKey of ROOM_ROUTING_KEYS) {
    await channel.bindQueue(QUEUE_NAME, exchange, routingKey);
  }

  await channel.consume(QUEUE_NAME, (msg) => handleMessage(msg));

  console.log(`[RESERVATIONS][Broker] Escuchando eventos room.* en "${QUEUE_NAME}"`);
}

async function handleMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg) {
    return;
  }

  const channel = getRabbitChannel();

  try {
    const message = JSON.parse(msg.content.toString()) as RoomEventMessage;
    const { data } = message;

    if (message.event === "ROOM_DELETED") {
      await roomSnapshotRepository.deleteByRoomId(data.roomId);
    } else {
      await roomSnapshotRepository.upsert({
        roomId: data.roomId,
        number: data.number,
        type: data.type as string,
        price: data.price as number,
        capacity: data.capacity as number,
        status: data.status as string
      });
    }

    channel.ack(msg);
  } catch (error) {
    console.error("[RESERVATIONS][Broker] Error procesando evento de habitación:", error);
    channel.nack(msg, false, false);
  }
}
