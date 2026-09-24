import api from "./api";

// Listar
export const getProduct = async () => {
  const res = await api.get("/products");
  return res.data;
};

// Crear
export const createProduct = async (data: unknown) => {
  const res = await api.post("/products", data);
  return res.data;
};

// Actualizar
export const updateProduct = async (id: string, data: unknown) => {
  const res = await api.put(`/products/${id}`, data);
  return res.data;
};

// Eliminar
export const deleteProduct = async (id: string) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};