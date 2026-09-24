import reservationsApi from "./reservationsApi";

export const getReservations = async () => {
  const res = await reservationsApi.get("/reservations");
  return res.data;
};

export const getReservationById = async (id: string) => {
  const res = await reservationsApi.get(`/reservations/${id}`);
  return res.data;
};

export const createReservation = async (data: unknown) => {
  return (await reservationsApi.post("/reservations", data)).data;
};

export const updateReservation = async (id: string, data: unknown) => {
  return (await reservationsApi.put(`/reservations/${id}`, data)).data;
};

export const confirmReservation = async (id: string) => {
  return (await reservationsApi.patch(`/reservations/${id}/confirm`)).data;
};

export const checkInReservation = async (id: string) => {
  return (await reservationsApi.patch(`/reservations/${id}/check-in`)).data;
};

export const checkOutReservation = async (id: string) => {
  return (await reservationsApi.patch(`/reservations/${id}/check-out`)).data;
};

export const cancelReservation = async (id: string) => {
  return (await reservationsApi.patch(`/reservations/${id}/cancel`)).data;
};

export const deleteReservation = async (id: string) => {
  return (await reservationsApi.delete(`/reservations/${id}`)).data;
};
