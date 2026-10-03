import { Document, Schema, Types, model } from "mongoose";

export type MovementType = "IN" | "OUT";

export interface IInventoryMovement extends Document {
  productId: Types.ObjectId;
  // Copia del nombre al momento del movimiento: el kardex sigue siendo
  // legible aunque después se elimine o renombre el producto.
  productName: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  date: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>({
  productId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["IN", "OUT"],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

inventoryMovementSchema.index({ productId: 1, date: -1 });

export const InventoryMovement = model<IInventoryMovement>(
  "InventoryMovement",
  inventoryMovementSchema
);
