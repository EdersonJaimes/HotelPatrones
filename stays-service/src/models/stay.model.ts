import { Document, Schema, model } from "mongoose";

export type StayStatus = "active" | "closed";

export interface IStayProduct {
  // Copia del nombre y precio al momento del consumo: la cuenta no cambia
  // aunque después se edite o elimine el producto.
  product: { _id: string; name: string };
  quantity: number;
  unitPrice: number;
}

export interface IStay extends Document {
  roomId: string;
  roomNumber: number;
  hourlyRate: number;
  status: StayStatus;
  startedAt: Date;
  endedAt?: Date;
  products: IStayProduct[];
  hours?: number;
  roomTotal?: number;
  productsTotal?: number;
  total?: number;
  startedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const stayProductSchema = new Schema<IStayProduct>(
  {
    product: {
      _id: { type: String, required: true },
      name: { type: String, required: true }
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const staySchema = new Schema<IStay>(
  {
    roomId: { type: String, required: true },
    roomNumber: { type: Number, required: true },
    hourlyRate: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "closed"], default: "active", required: true },
    startedAt: { type: Date, default: Date.now, required: true },
    endedAt: { type: Date },
    products: { type: [stayProductSchema], default: [] },
    hours: { type: Number },
    roomTotal: { type: Number },
    productsTotal: { type: Number },
    total: { type: Number },
    startedBy: { type: String }
  },
  { timestamps: true }
);

// Una habitación solo puede tener UNA estancia activa a la vez. Lo garantiza la
// base de datos (no solo el código), así dos peticiones simultáneas no la duplican.
staySchema.index(
  { roomId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

export const Stay = model<IStay>("Stay", staySchema);
