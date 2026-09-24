import { Document, Schema, model } from "mongoose";

export type RoomType = "individual" | "doble" | "triple" | "suite";
export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";

export const ROOM_AMENITIES = [
  "Aire acondicionado",
  "Ventilador",
  "TV",
  "Wifi",
  "Minibar",
  "Jacuzzi",
  "Balcón",
  "Caja fuerte"
] as const;

export type RoomAmenity = (typeof ROOM_AMENITIES)[number];

export interface IRoom extends Document {
  number: number;
  type: RoomType;
  price: number;
  status: RoomStatus;
  capacity: number;
  amenities: string[];
  cleaningMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
      min: 1
    },
    type: {
      type: String,
      enum: ["individual", "doble", "triple", "suite"],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["available", "occupied", "cleaning", "maintenance"],
      default: "available",
      required: true
    },
    capacity: {
      type: Number,
      required: true
    },
    amenities: {
      type: [{ type: String, enum: ROOM_AMENITIES }],
      required: true,
      default: []
    },
    cleaningMinutes: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Room = model<IRoom>("Room", roomSchema);
