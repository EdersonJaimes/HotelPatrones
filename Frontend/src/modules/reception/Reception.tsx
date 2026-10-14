import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import RoomCard from "../../components/RoomCard";
import StayModal from "../../components/StayModal";
import api from "../../services/api";
import { updateRoomStatus } from "../../services/roomService";
import { getActiveReservation, quickCheckin } from "../../services/stayService";
import type { ReservationWithAccount } from "../../services/stayService";

export default function Reception() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selected, setSelected] = useState<ReservationWithAccount | null>(null);

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

  // El cambio a "occupied" / "cleaning" lo hace rooms-service al recibir el
  // evento de RabbitMQ (asíncrono). Para que la pantalla responda al instante
  // se actualiza la tarjeta en local, y se vuelve a consultar un momento después.
  const setRoomStatusLocal = (roomId: string, status: string) =>
    setRooms((prev) => prev.map((r) => (r._id === roomId ? { ...r, status } : r)));

  const refreshSoon = () => {
    setTimeout(loadRooms, 1000);
    setTimeout(loadRooms, 3000);
  };

  // 🟢 Habitación disponible → pide el cliente → abre la cuenta con el hospedaje
  const handleStart = async (roomId: string) => {
    const { value: clientName } = await Swal.fire({
      title: "Check-in",
      input: "text",
      inputLabel: "Nombre del cliente",
      inputPlaceholder: "Nombre completo",
      showCancelButton: true,
      confirmButtonText: "Registrar entrada",
      inputValidator: (value) => (!value?.trim() ? "El nombre es obligatorio" : undefined),
    });

    if (!clientName) return;

    try {
      const reservation = await quickCheckin({ roomId, clientName: clientName.trim() });
      setRoomStatusLocal(roomId, "occupied");
      setSelected(reservation); // la cuenta queda abierta, con el hospedaje como primer cargo
      refreshSoon();
    } catch (error: any) {
      Swal.fire("No se pudo hacer check-in", error.response?.data?.message ?? "Error", "error");
    }
  };

  // 👁 Habitación ocupada → ver / seguir cargando su cuenta
  const handleView = async (roomId: string) => {
    try {
      setSelected(await getActiveReservation(roomId));
    } catch (error: any) {
      Swal.fire(
        "No se encontró una cuenta activa",
        error.response?.data?.message ?? "Error",
        "error"
      );
    }
  };

  // 🧹 Habitación en aseo → ya está limpia → vuelve a quedar disponible
  const handleFinishCleaning = async (roomId: string) => {
    const room = rooms.find((r) => r._id === roomId);

    const confirmation = await Swal.fire({
      title: `Habitación ${room?.number ?? ""}`,
      text: "¿El aseo ya terminó? Quedará disponible para un nuevo check-in.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, dejar disponible",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) return;

    try {
      await updateRoomStatus(roomId, "available");
      await loadRooms();
    } catch (error: any) {
      Swal.fire("No se pudo actualizar", error.response?.data?.message ?? "Error", "error");
    }
  };

  // Check-out hecho: la habitación pasa a aseo (lo confirma rooms-service por el broker).
  const handleCheckedOut = (roomId: string) => {
    setRoomStatusLocal(roomId, "cleaning");
    setSelected(null);
    refreshSoon();
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
              onFinishCleaning={handleFinishCleaning}
            />
          ))}
      </div>

      {selected && (
        <StayModal
          key={selected._id}
          reservation={selected}
          onClose={() => setSelected(null)}
          onCheckedOut={handleCheckedOut}
        />
      )}
    </div>
  );
}
