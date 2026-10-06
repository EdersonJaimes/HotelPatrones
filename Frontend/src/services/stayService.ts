import api from "./api";

// 🟢 iniciar estancia
export const startStay = async (roomId: string) => {
  const res = await api.post("/stays/start", { roomId });
  return res.data;
};

// ➕ agregar producto
export const addProduct = async (data: {
  stayId: string;
  productId: string;
  quantity: number;
}) => {
  const res = await api.post("/stays/add-product", data);
  return res.data;
};

// 🔴 checkout
export const checkout = async (stayId: string) => {
  const res = await api.post("/stays/checkout", { stayId });
  return res.data;
};

// 📄 obtener estancia activa
export const getActiveStay = async (roomId: string) => {
  const res = await api.get(`/stays/active/${roomId}`);
  return res.data;
};
