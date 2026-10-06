import api from "./api";

export const getReservations = async () => {
  const res = await api.get("/reservations");
  return res.data;
};

export const getReservationById = async (id: string) => {
  const res = await api.get(`/reservations/${id}`);
  return res.data;
};

export const createReservation = async (data: unknown) => {
  return (await api.post("/reservations", data)).data;
};

export const updateReservation = async (id: string, data: unknown) => {
  return (await api.put(`/reservations/${id}`, data)).data;
};

export const confirmReservation = async (id: string) => {
  return (await api.patch(`/reservations/${id}/confirm`)).data;
};

export const checkInReservation = async (id: string) => {
  return (await api.patch(`/reservations/${id}/check-in`)).data;
};

export const checkOutReservation = async (id: string) => {
  return (await api.patch(`/reservations/${id}/check-out`)).data;
};

export const cancelReservation = async (id: string) => {
  return (await api.patch(`/reservations/${id}/cancel`)).data;
};

export const deleteReservation = async (id: string) => {
  return (await api.delete(`/reservations/${id}`)).data;
};
