import { Document, Schema, model } from "mongoose";

export type ReservationChannel = "walk_in" | "phone" | "online" | "corporate";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export interface IReservationConsumption {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  addedAt: Date;
}

export interface IReservation extends Document {
  roomId: string;
  roomNumber: number;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  channel: ReservationChannel;
  status: ReservationStatus;
  basePrice: number;
  totalPrice: number;
  cancellationDeadline: Date;
  cancellationPenalty?: number;
  notes?: string;
  createdBy?: string;
  // Hora real de entrada/salida (distinta de checkIn/checkOut, que son las
  // fechas planeadas al momento de crear la reserva). Para un check-in de
  // recepción (walk-in), checkIn/checkOut son un estimado de 1 noche;
  // actualCheckIn/actualCheckOut son lo que de verdad ocurrió.
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  // Consumo de productos durante la estadía (la "cuenta" que va creciendo
  // entre el check-in y el check-out).
  consumptions: IReservationConsumption[];
  // Totales FINALES, calculados en el check-out real a partir de las noches
  // efectivamente transcurridas (actualCheckIn → actualCheckOut) más el
  // consumo. totalPrice (arriba) sigue siendo la cotización original hecha
  // al crear la reserva; roomTotal/grandTotal son lo que de verdad se cobra.
  roomTotal?: number;
  productsTotal?: number;
  grandTotal?: number;
  createdAt: Date;
  updatedAt: Date;
}

const reservationConsumptionSchema = new Schema<IReservationConsumption>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const reservationSchema = new Schema<IReservation>(
  {
    roomId: {
      type: String,
      required: true
    },
    roomNumber: {
      type: Number,
      required: true
    },
    clientName: {
      type: String,
      required: true,
      trim: true
    },
    clientDocument: {
      type: String,
      trim: true
    },
    clientPhone: {
      type: String,
      trim: true
    },
    checkIn: {
      type: Date,
      required: true
    },
    checkOut: {
      type: Date,
      required: true
    },
    guests: {
      type: Number,
      required: true,
      min: 1
    },
    channel: {
      type: String,
      enum: ["walk_in", "phone", "online", "corporate"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "checked_in", "checked_out", "cancelled"],
      default: "pending",
      required: true
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    cancellationDeadline: {
      type: Date,
      required: true
    },
    cancellationPenalty: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: String
    },
    actualCheckIn: {
      type: Date
    },
    actualCheckOut: {
      type: Date
    },
    consumptions: {
      type: [reservationConsumptionSchema],
      default: []
    },
    roomTotal: {
      type: Number,
      min: 0
    },
    productsTotal: {
      type: Number,
      min: 0
    },
    grandTotal: {
      type: Number,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

export const Reservation = model<IReservation>("Reservation", reservationSchema);
