import { ReservationChannel, ReservationStatus } from "../models/reservation.model";

/**
 * Patrón Flyweight (GoF, estructural) aplicado al listado de reservas.
 *
 * El análisis de RAM mostró que listReservations() es el proceso que más
 * memoria usa (4 500 reservas ≈ 24 MB por petición) y que casi la mitad de lo
 * que guarda cada fila se repite en todas las demás:
 *
 *   · Estado INTRÍNSECO (se repite, inmutable): la habitación (120 distintas),
 *     el canal (4), el estado (5) y quién la creó (unos pocos usuarios). Vive
 *     en los flyweights, que la fábrica crea UNA vez y comparte por referencia.
 *   · Estado EXTRÍNSECO (propio de cada reserva): id, huésped, fechas, precios,
 *     notas y consumos. Vive en el contexto (ReservationEntry).
 *
 * Igual que en Refactoring.Guru (Particle / MovingParticle): el contexto no
 * arma la fila por su cuenta, se la pide al flyweight pasándole su estado
 * extrínseco, como `particle.draw(coords, canvas)`.
 */

// ---------- Flyweights (estado intrínseco, compartido e inmutable) ----------

export class ChannelFlyweight {
  constructor(public readonly code: ReservationChannel) {
    Object.freeze(this);
  }
}

export class StatusFlyweight {
  constructor(public readonly code: ReservationStatus) {
    Object.freeze(this);
  }
}

export class CreatorFlyweight {
  constructor(public readonly userId: string) {
    Object.freeze(this);
  }
}

// Estado extrínseco: todo lo de la reserva menos lo que aportan los flyweights.
export interface ReservationExtrinsicState {
  _id: { toString(): string };
  [field: string]: unknown;
}

export class RoomRefFlyweight {
  constructor(
    public readonly roomId: string,
    public readonly roomNumber: number
  ) {
    Object.freeze(this);
  }

  // Operación del flyweight: recibe el estado extrínseco desde afuera y arma
  // la fila con la forma que espera el frontend (Reservation). Las cadenas de
  // habitación, canal, estado y creador son las MISMAS en todas las filas.
  toView(
    state: ReservationExtrinsicState,
    channel: ChannelFlyweight,
    status: StatusFlyweight,
    creator?: CreatorFlyweight
  ) {
    return {
      ...state,
      _id: state._id.toString(),
      roomId: this.roomId,
      roomNumber: this.roomNumber,
      channel: channel.code,
      status: status.code,
      createdBy: creator?.userId
    };
  }
}

// ---------- Fábrica ----------

// Entrega siempre el mismo objeto para la misma clave; solo crea si no existe.
export class FlyweightFactory<T> {
  private readonly pool = new Map<string, T>();

  get(key: string, create: () => T): T {
    let flyweight = this.pool.get(key);

    if (!flyweight) {
      flyweight = create();
      this.pool.set(key, flyweight);
    }

    return flyweight;
  }

  get size(): number {
    return this.pool.size;
  }
}

// Las fábricas viven mientras vive el servicio: los flyweights se reutilizan
// entre peticiones.
const rooms = new FlyweightFactory<RoomRefFlyweight>();
const channels = new FlyweightFactory<ChannelFlyweight>();
const statuses = new FlyweightFactory<StatusFlyweight>();
const creators = new FlyweightFactory<CreatorFlyweight>();

export function getRoomRefFlyweight(roomId: string, roomNumber: number): RoomRefFlyweight {
  return rooms.get(`${roomId}|${roomNumber}`, () => new RoomRefFlyweight(roomId, roomNumber));
}

export function getChannelFlyweight(code: ReservationChannel): ChannelFlyweight {
  return channels.get(code, () => new ChannelFlyweight(code));
}

export function getStatusFlyweight(code: ReservationStatus): StatusFlyweight {
  return statuses.get(code, () => new StatusFlyweight(code));
}

export function getCreatorFlyweight(userId: string): CreatorFlyweight {
  return creators.get(userId, () => new CreatorFlyweight(userId));
}

// Cuántos objetos compartidos hay hoy en cada fábrica (lo muestra la vista Patrones).
export function flyweightPoolSizes() {
  return { rooms: rooms.size, channels: channels.size, statuses: statuses.size, creators: creators.size };
}

// ---------- Contexto (estado extrínseco, uno por reserva) ----------

// Lo que entrega Mongo con .lean(): un objeto plano, sin la maquinaria del documento Mongoose.
export interface LeanReservation extends ReservationExtrinsicState {
  roomId: string;
  roomNumber: number;
  channel: ReservationChannel;
  status: ReservationStatus;
  createdBy?: string;
}

export class ReservationEntry {
  private readonly room: RoomRefFlyweight;
  private readonly channel: ChannelFlyweight;
  private readonly status: StatusFlyweight;
  private readonly creator?: CreatorFlyweight;
  private readonly state: ReservationExtrinsicState;

  constructor(reservation: LeanReservation) {
    const { roomId, roomNumber, channel, status, createdBy, ...state } = reservation;
    this.room = getRoomRefFlyweight(roomId, roomNumber);
    this.channel = getChannelFlyweight(channel);
    this.status = getStatusFlyweight(status);
    this.creator = createdBy ? getCreatorFlyweight(createdBy) : undefined;
    this.state = state;
  }

  // Delegación al flyweight, como MovingParticle.draw(canvas) → particle.draw(coords, canvas).
  toView() {
    return this.room.toView(this.state, this.channel, this.status, this.creator);
  }
}
