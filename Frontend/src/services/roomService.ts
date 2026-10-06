import api from "./api";

export const getRooms = async () => {
  const res = await api.get("/rooms");
  return res.data;
};

export const createRoom = async (data: any) => {
  return (await api.post("/rooms", data)).data;
};

export const updateRoom = async (id: string, data: any) => {
  return (await api.put(`/rooms/${id}`, data)).data;
};

export const deleteRoom = async (id: string) => {
  return (await api.delete(`/rooms/${id}`)).data;
};
