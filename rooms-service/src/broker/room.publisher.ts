import { broker } from "./broker.facade";
import { RoomStatus, RoomType } from "../models/room.model";

interface RoomEventData {
  roomId: string;
  number: number;
  type: RoomType;
  price: number;
  status: RoomStatus;
  capacity: number;
}

export async function publishRoomCreated(data: RoomEventData): Promise<void> {
  broker.publish("room.created", "ROOM_CREATED", data);
}

export async function publishRoomUpdated(data: RoomEventData): Promise<void> {
  broker.publish("room.updated", "ROOM_UPDATED", data);
}

export async function publishRoomStatusChanged(data: RoomEventData): Promise<void> {
  broker.publish("room.status_changed", "ROOM_STATUS_CHANGED", data);
}

export async function publishRoomDeleted(data: { roomId: string; number: number }): Promise<void> {
  broker.publish("room.deleted", "ROOM_DELETED", data);
}
