import { Document, Schema, model } from "mongoose";

/**
 * Read-model local, alimentado vía RabbitMQ (room.* events) desde rooms-service.
 * Permite validar habitación/precio/capacidad sin depender de una llamada HTTP
 * síncrona a rooms-service.
 */
export interface IRoomSnapshot extends Document {
  roomId: string;
  number: number;
  type: string;
  price: number;
  capacity: number;
  status: string;
  updatedAt: Date;
}

const roomSnapshotSchema = new Schema<IRoomSnapshot>(
  {
    roomId: { type: String, required: true, unique: true },
    number: { type: Number, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, required: true }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

export const RoomSnapshot = model<IRoomSnapshot>("RoomSnapshot", roomSnapshotSchema);
