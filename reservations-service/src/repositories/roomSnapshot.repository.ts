import { IRoomSnapshot, RoomSnapshot } from "../models/roomSnapshot.model";

export interface UpsertRoomSnapshotData {
  roomId: string;
  number: number;
  type: string;
  price: number;
  capacity: number;
  status: string;
}

export class RoomSnapshotRepository {
  async findByRoomId(roomId: string): Promise<IRoomSnapshot | null> {
    return RoomSnapshot.findOne({ roomId });
  }

  async upsert(data: UpsertRoomSnapshotData): Promise<void> {
    await RoomSnapshot.findOneAndUpdate({ roomId: data.roomId }, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });
  }

  async deleteByRoomId(roomId: string): Promise<void> {
    await RoomSnapshot.deleteOne({ roomId });
  }
}
