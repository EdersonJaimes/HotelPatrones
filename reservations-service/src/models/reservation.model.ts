import { Document, Schema, model } from "mongoose";

export type ReservationChannel = "walk_in" | "phone" | "online" | "corporate";
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

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
  createdAt: Date;
  updatedAt: Date;
}

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
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

export const Reservation = model<IReservation>("Reservation", reservationSchema);
