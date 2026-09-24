import { getRabbitChannel } from "./rabbitmq";
import { RoomStatus, RoomType } from "../models/room.model";

interface RoomEventData {
  roomId: string;
  number: number;
  type: RoomType;
  price: number;
  status: RoomStatus;
  capacity: number;
}

function publish(routingKey: string, eventName: string, data: unknown): void {
  const channel = getRabbitChannel();
  const exchange = process.env.RABBITMQ_EXCHANGE as string;

  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    data
  };

  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      contentType: "application/json"
    }
  );

  console.log(`[ROOMS][Broker] Evento publicado: ${routingKey}`);
}

export async function publishRoomCreated(data: RoomEventData): Promise<void> {
  publish("room.created", "ROOM_CREATED", data);
}

export async function publishRoomUpdated(data: RoomEventData): Promise<void> {
  publish("room.updated", "ROOM_UPDATED", data);
}

export async function publishRoomStatusChanged(data: RoomEventData): Promise<void> {
  publish("room.status_changed", "ROOM_STATUS_CHANGED", data);
}

export async function publishRoomDeleted(data: { roomId: string; number: number }): Promise<void> {
  publish("room.deleted", "ROOM_DELETED", data);
}
