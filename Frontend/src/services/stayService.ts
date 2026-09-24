import axios from "axios";

const API = "http://localhost:3000/api/stays";

const stayApi = axios.create({
  baseURL: API,
});

stayApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🟢 iniciar estancia
export const startStay = async (roomId: string) => {
  const res = await stayApi.post("/start", { roomId });
  return res.data;
};

// ➕ agregar producto
export const addProduct = async (data: any) => {
  const res = await stayApi.post("/add-product", data);
  return res.data;
};

// 🔴 checkout
export const checkout = async (stayId: string) => {
  const res = await stayApi.post("/checkout", { stayId });
  return res.data;
};

// 📄 obtener estancia activa
export const getActiveStay = async (roomId: string) => {
  const res = await stayApi.get(`/active/${roomId}`);
  return res.data;
};