import { broker } from "./broker.facade";
import { RoomService } from "../services/room.service";

interface ReservationEventData {
  reservationId: string;
  roomId: string;
}

const roomService = new RoomService();

/**
 * rooms-service reacciona a los eventos que emite reservations-service para
 * mantener el estado físico de la habitación sincronizado con el ciclo de vida
 * de la reserva. Solo queda la regla de negocio: la mecánica de RabbitMQ
 * (cola, bindings, parseo, ack/nack) la resuelve la fachada.
 */
export async function startReservationConsumer(): Promise<void> {
  await broker.subscribe<ReservationEventData>({
    queue: "rooms.reservation_sync",
    routingKeys: ["reservation.checked_in", "reservation.checked_out"],
    handler: async ({ event, data }) => {
      if (event === "RESERVATION_CHECKED_IN") {
        await roomService.updateRoomStatus(data.roomId, "occupied");
      } else if (event === "RESERVATION_CHECKED_OUT") {
        await roomService.updateRoomStatus(data.roomId, "cleaning");
      }
    }
  });
}
