// PATRÓN FLYWEIGHT (estructural) en el listado de reservas.
//
// Problema: el análisis de RAM mostró que la lista de reservas es el proceso que más memoria usa
// (4 500 reservas) y que casi la mitad de cada fila se repite: la habitación (120 distintas), el canal (4),
// el estado (5) y quién la creó. Al hacer JSON.parse, cada fila trae su propia copia de esas cadenas.
//
// Solución: se separa el estado en dos partes.
//   · Intrínseco (igual para muchos, inmutable): habitación, canal, estado y creador. La fábrica crea
//     UNA vez cada uno y todas las filas lo comparten por referencia.
//   · Extrínseco (propio de cada reserva): huésped, fechas, precios, notas. Es lo único que la fila guarda.
//
// La fila (ReservationRow) sigue leyéndose igual que una Reservation (r.roomNumber, r.status…): esos
// campos son getters que preguntan a su flyweight, así las pantallas no cambian.

import type { Reservation, ReservationChannel, ReservationStatus } from "../types/domain";
import { FlyweightFactory } from "./flyweight";

export type RawReservation = Reservation & { createdBy?: string };

// ---------- Flyweights (estado intrínseco, compartido) ----------
export interface RoomFly {
  readonly roomId: string;
  readonly roomNumber: number;
}

export interface CodeFly<T extends string> {
  readonly code: T;
}

type Extrinsic = Omit<RawReservation, "roomId" | "roomNumber" | "channel" | "status" | "createdBy">;

// ---------- Contexto (estado extrínseco, uno por reserva) ----------
export class ReservationRow {
  declare _id: string;
  declare clientName: string;
  declare clientDocument?: string;
  declare clientPhone?: string;
  declare checkIn: string;
  declare checkOut: string;
  declare guests: number;
  declare basePrice: number;
  declare totalPrice: number;
  declare cancellationDeadline: string;
  declare cancellationPenalty?: number;
  declare notes?: string;
  readonly room: RoomFly;
  readonly channelFly: CodeFly<ReservationChannel>;
  readonly statusFly: CodeFly<ReservationStatus>;
  readonly creatorFly?: CodeFly<string>;

  constructor(
    state: Extrinsic,
    room: RoomFly,
    channelFly: CodeFly<ReservationChannel>,
    statusFly: CodeFly<ReservationStatus>,
    creatorFly?: CodeFly<string>,
  ) {
    Object.assign(this, state);
    this.room = room;
    this.channelFly = channelFly;
    this.statusFly = statusFly;
    this.creatorFly = creatorFly;
  }

  get roomId() {
    return this.room.roomId;
  }
  get roomNumber() {
    return this.room.roomNumber;
  }
  get channel() {
    return this.channelFly.code;
  }
  get status() {
    return this.statusFly.code;
  }
  get createdBy() {
    return this.creatorFly?.code;
  }
}

export interface ReservationStore {
  rows: ReservationRow[];
  rooms: FlyweightFactory<RoomFly>;
  channels: FlyweightFactory<CodeFly<ReservationChannel>>;
  statuses: FlyweightFactory<CodeFly<ReservationStatus>>;
  creators: FlyweightFactory<CodeFly<string>>;
}

export function buildReservations(raw: RawReservation[]): ReservationStore {
  const rooms = new FlyweightFactory<RoomFly>();
  const channels = new FlyweightFactory<CodeFly<ReservationChannel>>();
  const statuses = new FlyweightFactory<CodeFly<ReservationStatus>>();
  const creators = new FlyweightFactory<CodeFly<string>>();

  const rows = raw.map(({ roomId, roomNumber, channel, status, createdBy, ...state }) =>
    new ReservationRow(
      state,
      rooms.get(`${roomId}|${roomNumber}`, () => ({ roomId, roomNumber })),
      channels.get(channel, () => ({ code: channel })),
      statuses.get(status, () => ({ code: status })),
      createdBy ? creators.get(createdBy, () => ({ code: createdBy })) : undefined,
    ),
  );

  return { rows, rooms, channels, statuses, creators };
}

// ---------- Memoria estimada ----------
// La misma estimación que el laboratorio del kardex: cadena ~2 bytes por carácter + 16 de cabecera,
// objeto 16 + 8 por campo, arreglo 16 + 8 por elemento; los números van dentro del objeto.
function sizeOf(value: unknown): number {
  if (typeof value === "string") return 16 + value.length * 2;
  if (Array.isArray(value)) return 16 + value.length * 8 + value.reduce((s: number, v) => s + sizeOf(v), 0);
  if (value && typeof value === "object") {
    const fields = Object.values(value);
    return 16 + fields.length * 8 + fields.reduce((s: number, v) => s + sizeOf(v), 0);
  }
  return 0;
}

// Sin Flyweight: cada fila tal como la dejó JSON.parse, con todas sus copias.
export function estimatePlainReservations(raw: RawReservation[]): number {
  return raw.reduce((s, r) => s + sizeOf(r), 0);
}

// Con Flyweight: cada fila guarda lo suyo + 4 referencias; los flyweights se cuentan una sola vez.
const FLY_FIELDS = new Set(["room", "channelFly", "statusFly", "creatorFly"]);

export function estimateFlyReservations(store: ReservationStore): number {
  let bytes = 0;
  for (const row of store.rows) {
    const fields = Object.entries(row);
    bytes += 16 + fields.length * 8;
    for (const [key, value] of fields) if (!FLY_FIELDS.has(key)) bytes += sizeOf(value);
  }
  for (const pool of [store.rooms, store.channels, store.statuses, store.creators]) {
    for (const fly of pool.values()) bytes += sizeOf(fly);
  }
  return bytes;
}
