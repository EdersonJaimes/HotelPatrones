import api from "./api";
import roomsApi from "./roomsApi";

export const getRooms = async () => {
  const res = await roomsApi.get("/rooms");
  return res.data;
};

export const createRoom = async (data: any) => {
  return (await roomsApi.post("/rooms", data)).data;
};

export const updateRoom = async (id: string, data: any) => {
  return (await roomsApi.put(`/rooms/${id}`, data)).data;
};

export const deleteRoom = async (id: string) => {
  return (await roomsApi.delete(`/rooms/${id}`)).data;
};

// Cambiar solo el estado (available | occupied | cleaning | maintenance).
// rooms-service lo permite a admin y recepcionista. Va por el gateway (api),
// igual que el resto de llamadas de Recepción.
export const updateRoomStatus = async (id: string, status: string) => {
  return (await api.patch(`/rooms/${id}/status`, { status })).data;
};
