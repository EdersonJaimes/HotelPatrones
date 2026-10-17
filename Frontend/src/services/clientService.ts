import api from "./api";
import type { Client } from "../types/domain";

export const getClients = async (): Promise<Client[]> => (await api.get("/clients")).data;

export const createClient = async (data: { name: string; document: string; phone: string }): Promise<Client> =>
  (await api.post("/clients", data)).data;

export const updateClient = async (id: string, data: Partial<Client>): Promise<Client> =>
  (await api.put(`/clients/${id}`, data)).data;

export const deleteClient = async (id: string) => (await api.delete(`/clients/${id}`)).data;
