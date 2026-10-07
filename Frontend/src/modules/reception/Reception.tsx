import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import RoomCard from "../../components/RoomCard";
import StayModal from "../../components/StayModal";
import api from "../../services/api";
import { getActiveReservation, quickCheckin } from "../../services/stayService";

export default function Reception() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);

  // 🔥 cargar habitaciones
  const loadRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (error: any) {
      console.error("Error cargando habitaciones:", error.response?.data);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // 🟢 check-in inmediato: primero pide el nombre del cliente
  const handleStart = async (roomId: string) => {
    const { value: clientName } = await Swal.fire({
      title: "Check-in",
      input: "text",
      inputLabel: "Nombre del cliente",
      inputPlaceholder: "Nombre completo",
      showCancelButton: true,
      confirmButtonText: "Registrar entrada",
      inputValidator: (value) => (!value ? "El nombre es obligatorio" : undefined),
    });

    if (!clientName) return;

    try {
      await quickCheckin({ roomId, clientName });
      await loadRooms();
      Swal.fire("Check-in registrado", "", "success");
    } catch (error: any) {
      Swal.fire("No se pudo hacer check-in", error.response?.data?.message ?? "Error", "error");
    }
  };

  // 👁 ver la cuenta de una habitación ocupada
  const handleView = async (roomId: string) => {
    try {
      const reservation = await getActiveReservation(roomId);
      setSelectedReservation(reservation);
    } catch (error: any) {
      Swal.fire(
        "No se encontró una reserva activa",
        error.response?.data?.message ?? "Error",
        "error"
      );
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
      {selectedReservation && (
        <StayModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          reload={() => {
            loadRooms();
            setSelectedReservation(null);
          }}
        />
      )}
    </div>
  );
}
