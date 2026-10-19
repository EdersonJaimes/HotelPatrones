import { IRoom, Room, RoomStatus, RoomType } from "../models/room.model";

export interface CreateRoomData {
  number: number;
  type: RoomType;
  price: number;
  status?: RoomStatus;
  amenities: string[];
}

export interface UpdateRoomData {
  number?: number;
  type?: RoomType;
  price?: number;
  status?: RoomStatus;
  amenities?: string[];
}

export class RoomRepository {
  async findAll(): Promise<IRoom[]> {
    return Room.find().sort({ number: 1 });
  }

  async findById(id: string): Promise<IRoom | null> {
    return Room.findById(id);
  }

  async findByNumber(number: number): Promise<IRoom | null> {
    return Room.findOne({ number });
  }

  async existsByNumber(number: number): Promise<boolean> {
    return Boolean(await Room.exists({ number }));
  }

  async create(data: CreateRoomData): Promise<IRoom> {
    return Room.create(data);
  }

  async update(id: string, data: UpdateRoomData): Promise<IRoom | null> {
    return Room.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
  }

  async updateStatus(id: string, status: RoomStatus): Promise<IRoom | null> {
    return Room.findByIdAndUpdate(id, { status }, { returnDocument: "after", runValidators: true });
  }

  // Limpieza única de los documentos creados antes del Flyweight, que aún
  // traen su propia copia de capacity/cleaningMinutes. Va por el driver
  // porque esos campos ya no existen en el esquema de Mongoose.
  async dropIntrinsicCopies(): Promise<number> {
    const result = await Room.collection.updateMany(
      { $or: [{ capacity: { $exists: true } }, { cleaningMinutes: { $exists: true } }] },
      { $unset: { capacity: "", cleaningMinutes: "" } }
    );
    return result.modifiedCount;
  }

  async deleteById(id: string): Promise<IRoom | null> {
    return Room.findByIdAndDelete(id);
  }
}
