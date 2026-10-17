import api from "./api";
import type { Checkout, Stay } from "../types/domain";

// Iniciar estancia (check-in de mostrador): la habitación pasa a ocupada.
export const startStay = async (roomId: string): Promise<Stay> => (await api.post("/stays/start", { roomId })).data;

export const addProduct = async (data: { stayId: string; productId: string; quantity: number }): Promise<Stay> =>
  (await api.post("/stays/add-product", data)).data;

// Cierra la cuenta: calcula horas y totales y deja la habitación en aseo.
export const checkout = async (stayId: string): Promise<Checkout> => (await api.post("/stays/checkout", { stayId })).data;

export const getActiveStay = async (roomId: string): Promise<Stay> => (await api.get(`/stays/active/${roomId}`)).data;

export const listStays = async (status?: "active" | "closed"): Promise<Stay[]> =>
  (await api.get("/stays", { params: status ? { status } : undefined })).data;
