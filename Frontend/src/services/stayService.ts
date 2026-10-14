import api from "./api";

// Este archivo se llamaba "stayService" por el diseño anterior (estancias
// por horas). Se mantiene el nombre para no romper imports, pero ahora habla
// con /reservations (reserva → check-in → consumo → check-out).

export interface AccountLine {
  type: "room" | "product";
  concept: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  addedAt?: string;
}

// Cuenta detallada que arma el backend: primero el hospedaje, luego cada producto.
export interface Account {
  lines: AccountLine[];
  nights: number;
  roomTotal: number;
  productsTotal: number;
  grandTotal: number;
  closed: boolean;
}

export interface ReservationWithAccount {
  _id: string;
  roomId: string;
  roomNumber: number;
  clientName: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  account: Account;
  [key: string]: unknown;
}

// 🟢 click en habitación disponible → check-in inmediato (abre la cuenta con
// el cargo de hospedaje ya incluido).
export const quickCheckin = async (data: {
  roomId: string;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  guests?: number;
}): Promise<ReservationWithAccount> => {
  const res = await api.post("/reservations/quick-checkin", data);
  return res.data;
};

// ➕ cargar un producto a la cuenta (descuenta stock en products-service)
export const addConsumption = async (
  reservationId: string,
  data: { productId: string; quantity: number }
): Promise<ReservationWithAccount> => {
  const res = await api.post(`/reservations/${reservationId}/consumptions`, data);
  return res.data;
};

// 🔴 check-out: devuelve la cuenta definitiva y detallada
export const checkout = async (reservationId: string): Promise<ReservationWithAccount> => {
  const res = await api.patch(`/reservations/${reservationId}/check-out`, {});
  return res.data;
};

// 📄 cuenta abierta de una habitación ocupada
export const getActiveReservation = async (roomId: string): Promise<ReservationWithAccount> => {
  const res = await api.get(`/reservations/active/${roomId}`);
  return res.data;
};
