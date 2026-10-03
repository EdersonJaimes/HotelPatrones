import { broker } from "./broker.facade";
import { RoomSnapshotRepository } from "../repositories/roomSnapshot.repository";

interface RoomEventData {
  roomId: string;
  number: number;
  type?: string;
  price?: number;
  capacity?: number;
  status?: string;
}

const roomSnapshotRepository = new RoomSnapshotRepository();

/**
 * reservations-service mantiene un read-model local de las habitaciones
 * (RoomSnapshot) escuchando los eventos que publica rooms-service, en vez de
 * depender de una llamada HTTP síncrona. La mecánica de RabbitMQ la resuelve
 * la fachada; aquí solo queda qué hacer con cada evento.
 */
export async function startRoomSyncConsumer(): Promise<void> {
  await broker.subscribe<RoomEventData>({
    queue: "reservations.room_sync",
    routingKeys: ["room.created", "room.updated", "room.status_changed", "room.deleted"],
    handler: async ({ event, data }) => {
      if (event === "ROOM_DELETED") {
        await roomSnapshotRepository.deleteByRoomId(data.roomId);
      } else {
        await roomSnapshotRepository.upsert({
          roomId: data.roomId,
          number: data.number,
          type: data.type as string,
          price: data.price as number,
          capacity: data.capacity as number,
          status: data.status as string
        });
      }
    }
  });
}
