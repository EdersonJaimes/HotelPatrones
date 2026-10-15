import api from "./api";
import type { Room, RoomPrototype, RoomStatus, RoomType } from "../types/domain";

export const getRooms = async (): Promise<Room[]> => (await api.get("/rooms")).data;

export const getRoom = async (id: string): Promise<Room> => (await api.get(`/rooms/${id}`)).data;

// Patrón Prototype: las plantillas por tipo (tarifa sugerida, rango, capacidad, comodidades).
export const getPrototypes = async (): Promise<RoomPrototype[]> => (await api.get("/rooms/prototypes")).data;

export const createRoomFromPrototype = async (
  type: RoomType,
  data: { number: number; price?: number; amenities?: string[]; status?: RoomStatus }
): Promise<Room> => (await api.post(`/rooms/prototypes/${type}`, data)).data;

export const updateRoom = async (id: string, data: Partial<Room>): Promise<Room> =>
  (await api.put(`/rooms/${id}`, data)).data;

export const setRoomStatus = async (id: string, status: RoomStatus): Promise<Room> =>
  (await api.patch(`/rooms/${id}/status`, { status })).data;

export const deleteRoom = async (id: string) => (await api.delete(`/rooms/${id}`)).data;
