import api from "./api";
import type {
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

// 📦 obtener inventario
export const getInventory = async (): Promise<Inventory[]> => {
  try {
    const res = await api.get(
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
    const res = await api.post(
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
    const res = await api.post(
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
    const res = await api.get(
      `${INVENTORY_ENDPOINTS.BASE}${INVENTORY_ENDPOINTS.MOVEMENTS(productId)}`
    );
    return res.data;
  } catch (err: any) {
    console.error("Error getMovements:", err.response?.data || err);
    throw err;
  }
};