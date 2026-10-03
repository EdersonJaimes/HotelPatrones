import { broker } from "./broker.facade";
import { MovementType } from "../models/inventoryMovement.model";
import { ProductCategory } from "../models/product.model";

interface ProductEventData {
  productId: string;
  name: string;
  price: number;
  category: ProductCategory;
  stock: number;
}

interface StockChangedEventData {
  productId: string;
  name: string;
  type: MovementType;
  quantity: number;
  stock: number;
  reason?: string;
}

interface LowStockEventData {
  productId: string;
  name: string;
  stock: number;
  threshold: number;
}

export async function publishProductCreated(data: ProductEventData): Promise<void> {
  broker.publish("product.created", "PRODUCT_CREATED", data);
}

export async function publishProductUpdated(data: ProductEventData): Promise<void> {
  broker.publish("product.updated", "PRODUCT_UPDATED", data);
}

export async function publishProductDeleted(data: { productId: string; name: string }): Promise<void> {
  broker.publish("product.deleted", "PRODUCT_DELETED", data);
}

export async function publishStockChanged(data: StockChangedEventData): Promise<void> {
  broker.publish("inventory.stock_changed", "INVENTORY_STOCK_CHANGED", data);
}

export async function publishLowStock(data: LowStockEventData): Promise<void> {
  broker.publish("inventory.low_stock", "INVENTORY_LOW_STOCK", data);
}
