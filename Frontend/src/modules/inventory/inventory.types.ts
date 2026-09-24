export interface Product {
  _id: string;
  name: string;
}

export interface Inventory {
  _id: string;
  product: Product;
  stock: number;
}

export interface InventoryMovement {
  _id: string;
  product: Product | string;
  type: "IN" | "OUT";
  quantity: number;
  reason?: string;
  date: string;
}