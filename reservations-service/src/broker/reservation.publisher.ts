import { getRabbitChannel } from "./rabbitmq";
import { ReservationChannel, ReservationStatus } from "../models/reservation.model";
import { ReservationNotification } from "../factories/reservationChannel.factory";

interface ReservationEventData {
  reservationId: string;
  roomId: string;
  roomNumber: number;
  clientName: string;
  checkIn: string;
  checkOut: string;
  channel: ReservationChannel;
  status: ReservationStatus;
  totalPrice: number;
  notification?: ReservationNotification;
}

function publish(routingKey: string, eventName: string, data: unknown): void {
  const channel = getRabbitChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE as string;

  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    data
  };

  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      contentType: "application/json"
    }
  );

  console.log(`[RESERVATIONS][Broker] Evento publicado: ${routingKey}`);
}

export async function publishReservationCreated(data: ReservationEventData): Promise<void> {
  publish("reservation.created", "RESERVATION_CREATED", data);
}

export async function publishReservationUpdated(data: ReservationEventData): Promise<void> {
  publish("reservation.updated", "RESERVATION_UPDATED", data);
}

export async function publishReservationConfirmed(data: ReservationEventData): Promise<void> {
  publish("reservation.confirmed", "RESERVATION_CONFIRMED", data);
}

export async function publishReservationCheckedIn(data: ReservationEventData): Promise<void> {
  publish("reservation.checked_in", "RESERVATION_CHECKED_IN", data);
}

export async function publishReservationCheckedOut(data: ReservationEventData): Promise<void> {
  publish("reservation.checked_out", "RESERVATION_CHECKED_OUT", data);
}

export async function publishReservationCancelled(data: ReservationEventData): Promise<void> {
  publish("reservation.cancelled", "RESERVATION_CANCELLED", data);
}
