import { ConsumeMessage } from "amqplib";
import { getRabbitChannel } from "./rabbitmq";
import { RoomService } from "../services/room.service";

const QUEUE_NAME = "rooms.reservation_sync";

interface ReservationEventMessage {
  event: string;
  data: {
    reservationId: string;
    roomId: string;
  };
}

const roomService = new RoomService();

/**
 * Puente RabbitMQ: rooms-service reacciona a los eventos que emite
 * reservations-service para mantener el estado físico de la habitación
 * sincronizado con el ciclo de vida de la reserva, sin acoplarse a su base
 * de datos ni exponer una API interna.
 */
export async function startReservationConsumer(): Promise<void> {
  const exchange = process.env.RABBITMQ_EXCHANGE as string;
  const channel = getRabbitChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, exchange, "reservation.checked_in");
  await channel.bindQueue(QUEUE_NAME, exchange, "reservation.checked_out");

  await channel.consume(QUEUE_NAME, (msg) => handleMessage(msg));

  console.log(`[ROOMS][Broker] Escuchando reservation.checked_in / reservation.checked_out en "${QUEUE_NAME}"`);
}

async function handleMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg) {
    return;
  }

  const channel = getRabbitChannel();

  try {
    const message = JSON.parse(msg.content.toString()) as ReservationEventMessage;
    const { roomId } = message.data;

    if (message.event === "RESERVATION_CHECKED_IN") {
      await roomService.updateRoomStatus(roomId, "occupied");
    } else if (message.event === "RESERVATION_CHECKED_OUT") {
      await roomService.updateRoomStatus(roomId, "cleaning");
    }

    channel.ack(msg);
  } catch (error) {
    console.error("[ROOMS][Broker] Error procesando evento de reserva:", error);
    channel.nack(msg, false, false);
  }
}
