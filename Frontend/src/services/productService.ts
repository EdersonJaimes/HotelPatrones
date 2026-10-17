import api from "./api";
import type { Product, ProductCategory } from "../types/domain";

export const getProducts = async (): Promise<Product[]> => (await api.get("/products")).data;

export const createProduct = async (data: { name: string; price: number; category: ProductCategory }): Promise<Product> =>
  (await api.post("/products", data)).data;

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> =>
  (await api.put(`/products/${id}`, data)).data;

export const deleteProduct = async (id: string) => (await api.delete(`/products/${id}`)).data;
