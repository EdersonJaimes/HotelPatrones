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