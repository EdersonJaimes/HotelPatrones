export type ReservationChannel = "walk_in" | "phone" | "online" | "corporate";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export interface Reservation {
  _id: string;
  roomId: string;
  roomNumber: number;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  channel: ReservationChannel;
  status: ReservationStatus;
  basePrice: number;
  totalPrice: number;
  cancellationDeadline: string;
  cancellationPenalty?: number;
  notes?: string;
}
