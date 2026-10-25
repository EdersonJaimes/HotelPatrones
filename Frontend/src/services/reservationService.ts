import api from "./api";
import { buildReservations, type RawReservation } from "../lib/reservationFlyweight";
import type { Reservation, ReservationChannel } from "../types/domain";

export interface ReservationInput {
  roomId: string;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  channel: ReservationChannel;
  notes?: string;
}

// Patrón Flyweight: las filas comparten habitación, canal, estado y creador (lib/reservationFlyweight.ts).
export const getReservations = async (): Promise<Reservation[]> =>
  buildReservations((await api.get<RawReservation[]>("/reservations")).data).rows;

export const createReservation = async (data: ReservationInput): Promise<Reservation> =>
  (await api.post("/reservations", data)).data;

// El canal y la habitación no cambian al editar: solo lo que el servicio permite.
export const updateReservation = async (id: string, data: Partial<ReservationInput>): Promise<Reservation> =>
  (await api.put(`/reservations/${id}`, data)).data;

export const confirmReservation = async (id: string): Promise<Reservation> => (await api.patch(`/reservations/${id}/confirm`)).data;
export const checkInReservation = async (id: string): Promise<Reservation> => (await api.patch(`/reservations/${id}/check-in`)).data;
export const checkOutReservation = async (id: string): Promise<Reservation> => (await api.patch(`/reservations/${id}/check-out`)).data;
export const cancelReservation = async (id: string): Promise<Reservation> => (await api.patch(`/reservations/${id}/cancel`)).data;
