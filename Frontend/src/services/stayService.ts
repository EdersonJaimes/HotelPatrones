import api from "./api";

// Este archivo se llamaba "stayService" por el diseño anterior (estancias
// por horas). Se mantiene el nombre del archivo para no romper los imports
// existentes, pero ahora habla con /reservations (el modelo real del backend:
// reserva → confirmación → check-in → check-out, con consumo de productos).

// 🟢 Recepción: click en la habitación → check-in inmediato (crea, confirma
// y hace check-in en un solo paso dentro de reservations-service).
export const quickCheckin = async (data: {
  roomId: string;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  guests?: number;
}) => {
  const res = await api.post("/reservations/quick-checkin", data);
  return res.data;
};

// ➕ agregar producto a la cuenta de una reserva con check-in activo
export const addConsumption = async (
  reservationId: string,
  data: { productId: string; quantity: number }
) => {
  const res = await api.post(`/reservations/${reservationId}/consumptions`, data);
  return res.data;
};

// 🔴 checkout: calcula y persiste roomTotal + productsTotal + grandTotal
export const checkout = async (reservationId: string) => {
  const res = await api.patch(`/reservations/${reservationId}/check-out`, {});
  return res.data;
};

// 📄 reserva con check-in activo para una habitación (para abrir su cuenta)
export const getActiveReservation = async (roomId: string) => {
  const res = await api.get(`/reservations/active/${roomId}`);
  return res.data;
};
