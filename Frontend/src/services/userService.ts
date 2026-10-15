import api from "./api";
import type { User } from "../types/domain";

export const getUsers = async (): Promise<User[]> => (await api.get("/auth/users")).data;

export const createUser = async (data: { username: string; name: string; password: string; role: User["role"] }) =>
  (await api.post("/auth/users", data)).data;

export const updateUser = async (id: string, data: { name?: string; password?: string; role?: User["role"]; active?: boolean }) =>
  (await api.put(`/auth/users/${id}`, data)).data;

export const deleteUser = async (id: string) => (await api.delete(`/auth/users/${id}`)).data;
