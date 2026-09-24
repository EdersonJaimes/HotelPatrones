import type { Reservation, ReservationChannel, ReservationStatus } from "./reservation.types";

export const RESERVATION_CHANNEL_OPTIONS: { label: string; value: ReservationChannel }[] = [
  { label: "Mostrador (walk-in)", value: "walk_in" },
  { label: "Teléfono", value: "phone" },
  { label: "Online", value: "online" },
  { label: "Corporativo", value: "corporate" },
];

const RESERVATION_CHANNEL_LABELS: Record<ReservationChannel, string> = {
  walk_in: "Mostrador",
  phone: "Teléfono",
  online: "Online",
  corporate: "Corporativo",
};

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  checked_out: "Check-out",
  cancelled: "Cancelada",
};

const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: "bg-yellow-200 text-yellow-800",
  confirmed: "bg-blue-200 text-blue-800",
  checked_in: "bg-green-200 text-green-800",
  checked_out: "bg-gray-300 text-gray-700",
  cancelled: "bg-red-200 text-red-800",
};

interface RoomOption {
  _id: string;
  number: number;
  type: string;
}

export const getReservationFields = (rooms: RoomOption[]) => [
  {
    name: "roomId",
    label: "Habitación",
    type: "select",
    options: rooms.map((room) => ({
      label: `Habitación ${room.number} (${room.type})`,
      value: room._id,
    })),
  },
  { name: "clientName", label: "Cliente", type: "text" },
  { name: "clientDocument", label: "Documento", type: "text" },
  { name: "clientPhone", label: "Teléfono", type: "text" },
  { name: "checkIn", label: "Check-in", type: "datetime-local" },
  { name: "checkOut", label: "Check-out", type: "datetime-local" },
  { name: "guests", label: "Huéspedes", type: "number" },
  {
    name: "channel",
    label: "Canal",
    type: "select",
    helpText: "Define la tarifa, la política de cancelación y la notificación de la reserva",
    options: RESERVATION_CHANNEL_OPTIONS,
  },
  { name: "notes", label: "Notas", type: "text" },
];

interface ReservationColumnActions {
  onConfirm: (row: Reservation) => void;
  onCheckIn: (row: Reservation) => void;
  onCheckOut: (row: Reservation) => void;
  onCancel: (row: Reservation) => void;
}

const actionButtonClass =
  "text-xs text-white px-2 py-1 rounded hover:opacity-90 transition";

export const buildReservationColumns = (actions: ReservationColumnActions) => [
  { header: "Habitación", accessor: "roomNumber" as const },
  { header: "Cliente", accessor: "clientName" as const },
  {
    header: "Check-in",
    accessor: "checkIn" as const,
    render: (row: Reservation) => new Date(row.checkIn).toLocaleString(),
  },
  {
    header: "Check-out",
    accessor: "checkOut" as const,
    render: (row: Reservation) => new Date(row.checkOut).toLocaleString(),
  },
  { header: "Huéspedes", accessor: "guests" as const },
  {
    header: "Canal",
    accessor: "channel" as const,
    render: (row: Reservation) => RESERVATION_CHANNEL_LABELS[row.channel],
  },
  {
    header: "Total",
    accessor: "totalPrice" as const,
    render: (row: Reservation) => `$${row.totalPrice.toLocaleString()}`,
  },
  {
    header: "Estado",
    accessor: "status" as const,
    render: (row: Reservation) => (
      <div className="flex flex-col items-start gap-1">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${RESERVATION_STATUS_COLORS[row.status]}`}>
          {RESERVATION_STATUS_LABELS[row.status]}
        </span>

        <div className="flex gap-1">
          {row.status === "pending" && (
            <button
              className={`${actionButtonClass} bg-blue-500`}
              onClick={() => actions.onConfirm(row)}
            >
              Confirmar
            </button>
          )}

          {row.status === "confirmed" && (
            <button
              className={`${actionButtonClass} bg-green-600`}
              onClick={() => actions.onCheckIn(row)}
            >
              Check-in
            </button>
          )}

          {row.status === "checked_in" && (
            <button
              className={`${actionButtonClass} bg-purple-600`}
              onClick={() => actions.onCheckOut(row)}
            >
              Check-out
            </button>
          )}

          {(row.status === "pending" || row.status === "confirmed") && (
            <button
              className={`${actionButtonClass} bg-red-500`}
              onClick={() => actions.onCancel(row)}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    ),
  },
];
