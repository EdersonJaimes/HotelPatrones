import { broker } from "./broker.facade";
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

export async function publishReservationCreated(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.created", "RESERVATION_CREATED", data);
}

export async function publishReservationUpdated(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.updated", "RESERVATION_UPDATED", data);
}

export async function publishReservationConfirmed(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.confirmed", "RESERVATION_CONFIRMED", data);
}

export async function publishReservationCheckedIn(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.checked_in", "RESERVATION_CHECKED_IN", data);
}

export async function publishReservationCheckedOut(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.checked_out", "RESERVATION_CHECKED_OUT", data);
}

export async function publishReservationCancelled(data: ReservationEventData): Promise<void> {
  broker.publish("reservation.cancelled", "RESERVATION_CANCELLED", data);
}

interface ReservationConsumptionEventData {
  reservationId: string;
  roomId: string;
  roomNumber: number;
  productId: string;
  name: string;
  quantity: number;
  subtotal: number;
}

export async function publishReservationConsumptionAdded(
  data: ReservationConsumptionEventData
): Promise<void> {
  broker.publish("reservation.consumption_added", "RESERVATION_CONSUMPTION_ADDED", data);
}
