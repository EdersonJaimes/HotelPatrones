import api from "./api";

// Listar
export const getUsers = async () => {
  const res = await api.get("/auth/users");
  return res.data;
};

// Crear
export const createUser = async (data: unknown) => {
  const res = await api.post("/auth/users", data);
  return res.data;
};

// Actualizar
export const updateUser = async (id: string, data: unknown) => {
  const res = await api.put(`/auth/users/${id}`, data);
  return res.data;
};

// Eliminar
export const deleteUser = async (id: string) => {
  const res = await api.delete(`/auth/users/${id}`);
  return res.data;
};