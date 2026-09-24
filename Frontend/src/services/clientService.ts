import api from "./api";

// Listar
export const getClients = async () => {
  const res = await api.get("/clients");
  return res.data;
};

// Crear
export const createClient = async (data: unknown) => {
  const res = await api.post("/clients", data);
  return res.data;
};

// Actualizar
export const updateClient = async (id: string, data: unknown) => {
  const res = await api.put(`/clients/${id}`, data);
  return res.data;
};

// Eliminar
export const deleteClient = async (id: string) => {
  const res = await api.delete(`/clients/${id}`);
  return res.data;
};