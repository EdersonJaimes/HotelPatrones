import api from "./api";
import type { InventoryMovement, InventoryRow } from "../types/domain";

export const getInventory = async (): Promise<InventoryRow[]> => (await api.get("/inventory")).data;

export const addStock = async (data: { productId: string; quantity: number; reason: string }) =>
  (await api.post("/inventory/add", data)).data;

export const removeStock = async (data: { productId: string; quantity: number; reason: string }) =>
  (await api.post("/inventory/remove", data)).data;

// Historial de un producto (el más reciente primero).
export const getMovements = async (productId: string): Promise<InventoryMovement[]> =>
  (await api.get(`/inventory/movements/${productId}`)).data;

// Kardex general: últimos movimientos de todos los productos.
export const getRecentMovements = async (limit = 200): Promise<InventoryMovement[]> =>
  (await api.get("/inventory/movements", { params: { limit } })).data;

// Total consumido por producto ({ _id, total }), de mayor a menor.
export const getTopConsumed = async (limit = 5000): Promise<{ _id: string; total: number }[]> =>
  (await api.get("/inventory/top-consumed", { params: { limit } })).data;
