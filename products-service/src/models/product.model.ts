import { Document, Schema, model } from "mongoose";

// Las mismas categorías que ofrece el select del frontend (product.config.ts).
export const PRODUCT_CATEGORIES = ["Bebida", "Snack", "Aseo", "General"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface IProduct extends Document {
  name: string;
  price: number;
  category: ProductCategory;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      default: "General"
    },
    // El stock solo cambia por los endpoints de inventario, nunca por el CRUD
    // del producto. min: 0 evita stock negativo a nivel de base de datos.
    stock: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Nombre único sin distinguir mayúsculas ("Agua" y "agua" son el mismo producto).
productSchema.index({ name: 1 }, { unique: true, collation: { locale: "es", strength: 2 } });

export const Product = model<IProduct>("Product", productSchema);
