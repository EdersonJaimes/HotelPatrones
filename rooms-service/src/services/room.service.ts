import {
  publishRoomCreated,
  publishRoomDeleted,
  publishRoomStatusChanged,
  publishRoomUpdated
} from "../broker/room.publisher";
import { RoomEntry } from "../flyweights/roomType.flyweight";
import { IRoom, RoomStatus, RoomType } from "../models/room.model";
import { getRoomPrototype, listRoomPrototypes, validatePriceForType } from "../prototypes/room.prototype";
import { RoomRepository } from "../repositories/room.repository";

// ---- Patrón Flyweight ----
// La habitación guardada solo trae su estado extrínseco. El contexto
// (RoomEntry) le pide al flyweight compartido de su tipo que agregue
// capacity y cleaningMinutes, así la API y los eventos room.* mantienen la
// misma forma de siempre.
function toRoomView(room: IRoom) {
  return new RoomEntry(room.toObject()).toView();
}

function toRoomEvent(room: IRoom) {
  return new RoomEntry(room.toObject()).toEvent();
}

export class RoomService {
  private readonly roomRepository = new RoomRepository();

  async listRooms() {
    const rooms = await this.roomRepository.findAll();
    return rooms.map(toRoomView);
  }

  async getRoomById(id: string) {
    const room = await this.roomRepository.findById(id);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    return toRoomView(room);
  }

  // Quita de los documentos viejos las copias de capacity/cleaningMinutes
  // que ahora viven en el flyweight. Se llama una vez al arrancar.
  async dropIntrinsicCopies() {
    return this.roomRepository.dropIntrinsicCopies();
  }

  async createRoom(data: {
    number: number;
    type: RoomType;
    price: number;
    status?: RoomStatus;
    amenities?: string[];
  }) {
    const exists = await this.roomRepository.existsByNumber(data.number);

    if (exists) {
      throw new Error("Ya existe una habitación con ese número");
    }

    validatePriceForType(data.type, data.price);

    // Partimos del prototipo clonado de este tipo para completar lo que no
    // se indicó explícitamente (estado y amenities). La capacidad y los
    // minutos de aseo no se guardan: los aporta el flyweight del tipo.
    const prototype = getRoomPrototype(data.type);

    const room = await this.roomRepository.create({
      number: data.number,
      type: data.type,
      price: data.price,
      status: data.status ?? prototype.status,
      amenities: data.amenities ?? prototype.amenities
    });

    await publishRoomCreated(toRoomEvent(room));

    return toRoomView(room);
  }

  async updateRoom(
    id: string,
    data: {
      number?: number;
      type?: RoomType;
      price?: number;
      status?: RoomStatus;
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

    // Si cambia el tipo, la capacidad y el aseo cambian solos: la habitación
    // pasa a apuntar a otro flyweight, no hay nada más que actualizar.
    if (data.type !== undefined || data.price !== undefined) {
      validatePriceForType(data.type ?? current.type, data.price ?? current.price);
    }

    const room = await this.roomRepository.update(id, {
      number: data.number,
      type: data.type,
      price: data.price,
      status: data.status,
      amenities: data.amenities
    });

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    await publishRoomUpdated(toRoomEvent(room));

    return toRoomView(room);
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
    // desde cero: la nueva habitación arranca con los valores por defecto
    // de ese tipo (precio sugerido, amenities, estado).
    const prototype = getRoomPrototype(data.type);

    const finalPrice = data.price ?? prototype.price;

    validatePriceForType(data.type, finalPrice);

    const room = await this.roomRepository.create({
      number: data.number,
      type: prototype.type,
      price: finalPrice,
      status: data.status ?? prototype.status,
      amenities: data.amenities ?? prototype.amenities
    });

    await publishRoomCreated(toRoomEvent(room));

    return toRoomView(room);
  }

  async updateRoomStatus(id: string, status: RoomStatus) {
    const room = await this.roomRepository.updateStatus(id, status);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    await publishRoomStatusChanged(toRoomEvent(room));

    return toRoomView(room);
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
