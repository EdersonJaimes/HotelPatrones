import { useEffect, useState } from "react";
import RoomCard from "../../components/RoomCard";
import StayModal from "../../components/StayModal";
import api from "../../services/api";
import { getActiveStay, startStay } from "../../services/stayService";

export default function Reception() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedStay, setSelectedStay] = useState<any>(null);

  // 🔥 cargar habitaciones
  const loadRooms = async () => {
    try {
      const res = await api.get("/rooms");
      console.log("ROOMS:", res.data);
      setRooms(res.data);
    } catch (error: any) {
      console.error("Error cargando habitaciones:", error.response?.data);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // 🟢 iniciar estancia
  const handleStart = async (roomId: string) => {
    try {
      console.log("Iniciando habitación:", roomId);

      await startStay(roomId);

      await loadRooms();
    } catch (error: any) {
      console.error("ERROR startStay:", error.response?.data);
    }
  };

  // 👁 ver estancia activa
  const handleView = async (roomId: string) => {
    try {
      const stay = await getActiveStay(roomId);
      console.log("STAY:", stay);

      setSelectedStay(stay);
    } catch (error: any) {
      console.error("ERROR getActiveStay:", error.response?.data);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Recepción</h1>

      <div className="grid grid-cols-4 gap-4">
        {Array.isArray(rooms) &&
          rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={room}
              onStart={handleStart}
              onView={handleView}
            />
          ))}
      </div>

      {/* MODAL */}
      {selectedStay && (
        <StayModal
          stay={selectedStay}
          onClose={() => setSelectedStay(null)}
          reload={() => {
            loadRooms();
            setSelectedStay(null);
          }}
        />
      )}
    </div>
  );
}