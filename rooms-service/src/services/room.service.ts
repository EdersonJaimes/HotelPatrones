import {
  publishRoomCreated,
  publishRoomDeleted,
  publishRoomStatusChanged,
  publishRoomUpdated
} from "../broker/room.publisher";
import { RoomStatus, RoomType } from "../models/room.model";
import { getRoomPrototype, listRoomPrototypes, validatePriceForType } from "../prototypes/room.prototype";
import { RoomRepository } from "../repositories/room.repository";

export class RoomService {
  private readonly roomRepository = new RoomRepository();

  async listRooms() {
    return this.roomRepository.findAll();
  }

  async getRoomById(id: string) {
    const room = await this.roomRepository.findById(id);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    return room;
  }

  async createRoom(data: {
    number: number;
    type: RoomType;
    price: number;
    status?: RoomStatus;
    capacity?: number;
    amenities?: string[];
  }) {
    const exists = await this.roomRepository.existsByNumber(data.number);

    if (exists) {
      throw new Error("Ya existe una habitación con ese número");
    }

    validatePriceForType(data.type, data.price);

    // En vez de una Factory aparte, partimos del prototipo clonado de este
    // tipo para completar lo que no se indicó explícitamente (capacity,
    // amenities, cleaningMinutes).
    const prototype = getRoomPrototype(data.type);

    const room = await this.roomRepository.create({
      number: data.number,
      type: data.type,
      price: data.price,
      status: data.status ?? prototype.status,
      capacity: data.capacity ?? prototype.capacity,
      amenities: data.amenities ?? prototype.amenities,
      cleaningMinutes: prototype.cleaningMinutes
    });

    await publishRoomCreated({
      roomId: room._id.toString(),
      number: room.number,
      type: room.type,
      price: room.price,
      status: room.status,
      capacity: room.capacity
    });

    return room;
  }

  async updateRoom(
    id: string,
    data: {
      number?: number;
      type?: RoomType;
      price?: number;
      status?: RoomStatus;
      capacity?: number;
      amenities?: string[];
    }
  ) {
    const current = await this.roomRepository.findById(id);

    if (!current) {
      throw new Error("Habitación no encontrada");
    }

    if (data.number !== undefined) {
      const existing = await this.roomRepository.findByNumber(data.number);

      if (existing && existing._id.toString() !== id) {
        throw new Error("Ya existe una habitación con ese número");
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    if (data.type !== undefined || data.price !== undefined || data.capacity !== undefined) {
      const effectiveType = data.type ?? current.type;
      const effectivePrice = data.price ?? current.price;

      validatePriceForType(effectiveType, effectivePrice);

      const prototype = getRoomPrototype(effectiveType);

      updateData.capacity = data.capacity ?? prototype.capacity;
      updateData.cleaningMinutes = prototype.cleaningMinutes;
    }

    const room = await this.roomRepository.update(id, updateData);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    await publishRoomUpdated({
      roomId: room._id.toString(),
      number: room.number,
      type: room.type,
      price: room.price,
      status: room.status,
      capacity: room.capacity
    });

    return room;
  }

  // ---- Patrón Prototype ----

  listPrototypes() {
    return listRoomPrototypes();
  }

  async createRoomFromPrototype(data: {
    type: RoomType;
    number: number;
    price?: number;
    amenities?: string[];
    status?: RoomStatus;
  }) {
    const exists = await this.roomRepository.existsByNumber(data.number);

    if (exists) {
      throw new Error("Ya existe una habitación con ese número");
    }

    // Clonamos la plantilla del tipo pedido en lugar de armar el objeto
    // desde cero: la nueva habitación arranca con todos los valores por
    // defecto de ese tipo (capacity, amenities, cleaningMinutes, price).
    const prototype = getRoomPrototype(data.type);

    const finalPrice = data.price ?? prototype.price;

    validatePriceForType(data.type, finalPrice);

    const room = await this.roomRepository.create({
      number: data.number,
      type: prototype.type,
      price: finalPrice,
      status: data.status ?? prototype.status,
      capacity: prototype.capacity,
      amenities: data.amenities ?? prototype.amenities,
      cleaningMinutes: prototype.cleaningMinutes
    });

    await publishRoomCreated({
      roomId: room._id.toString(),
      number: room.number,
      type: room.type,
      price: room.price,
      status: room.status,
      capacity: room.capacity
    });

    return room;
  }

  async updateRoomStatus(id: string, status: RoomStatus) {
    const room = await this.roomRepository.updateStatus(id, status);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    await publishRoomStatusChanged({
      roomId: room._id.toString(),
      number: room.number,
      type: room.type,
      price: room.price,
      status: room.status,
      capacity: room.capacity
    });

    return room;
  }

  async deleteRoom(id: string) {
    const room = await this.roomRepository.deleteById(id);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    await publishRoomDeleted({
      roomId: room._id.toString(),
      number: room.number
    });

    return room;
  }
}
