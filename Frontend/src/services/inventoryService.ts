import axios from "axios";
import {
  Inventory,
  InventoryMovement,
} from "../modules/inventory/inventory.types";

// 🔥 DEFINIMOS LOS ENDPOINTS AQUÍ (SOLUCIÓN)
const INVENTORY_ENDPOINTS = {
  BASE: "/inventory",
  GET_ALL: "",
  ADD: "/add",
  REMOVE: "/remove",
  MOVEMENTS: (productId: string) => `/movements/${productId}`,
};

const API = "http://localhost:3000/api";

const inventoryApi = axios.create({
  baseURL: API,
});

// 🔐 interceptor
inventoryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 📦 obtener inventario
export const getInventory = async (): Promise<Inventory[]> => {
  try {
    const res = await inventoryApi.get(
      `${INVENTORY_ENDPOINTS.BASE}${INVENTORY_ENDPOINTS.GET_ALL}`
    );
    return res.data;
  } catch (err: any) {
    console.error("Error getInventory:", err.response?.data || err);
    throw err;
  }
};

// ➕ agregar stock
export const addStock = async (data: {
  productId: string;
  quantity: number;
  reason: string;
}) => {
  try {
    const res = await inventoryApi.post(
      `${INVENTORY_ENDPOINTS.BASE}${INVENTORY_ENDPOINTS.ADD}`,
      data
    );
    return res.data;
  } catch (err: any) {
    console.error("Error addStock:", err.response?.data || err);
    throw err;
  }
};

// ➖ descontar stock
export const removeStock = async (data: {
  productId: string;
  quantity: number;
  reason: string;
}) => {
  try {
    const res = await inventoryApi.post(
      `${INVENTORY_ENDPOINTS.BASE}${INVENTORY_ENDPOINTS.REMOVE}`,
      data
    );
    return res.data;
  } catch (err: any) {
    console.error("Error removeStock:", err.response?.data || err);
    throw err;
  }
};

// 📄 historial de movimientos
export const getMovements = async (
  productId: string
): Promise<InventoryMovement[]> => {
  try {
    const res = await inventoryApi.get(
      `${INVENTORY_ENDPOINTS.BASE}${INVENTORY_ENDPOINTS.MOVEMENTS(productId)}`
    );
    return res.data;
  } catch (err: any) {
    console.error("Error getMovements:", err.response?.data || err);
    throw err;
  }
};