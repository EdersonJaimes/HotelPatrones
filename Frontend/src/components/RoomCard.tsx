import { formatMoney } from "../utils/format";

interface Props {
  room: any;
  onStart: (roomId: string) => void;
  onView: (roomId: string) => void;
  onFinishCleaning: (roomId: string) => void;
}

export default function RoomCard({ room, onStart, onView, onFinishCleaning }: Props) {
  // rooms-service devuelve el status en inglés:
  // available | occupied | cleaning | maintenance
  const status = room.status;

  const getStatusColor = () => {
    switch (status) {
      case "available":
        return "bg-green-200 border-green-500";
      case "occupied":
        return "bg-red-200 border-red-500";
      case "cleaning":
        return "bg-yellow-200 border-yellow-500";
      case "maintenance":
        return "bg-gray-300 border-gray-600";
      default:
        return "bg-white";
    }
  };

  const statusLabel: Record<string, string> = {
    available: "Disponible",
    occupied: "Ocupada",
    cleaning: "En aseo",
    maintenance: "Mantenimiento",
  };

  const renderButton = () => {
    if (status === "available") {
      return (
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mt-2"
          onClick={() => onStart(room._id)}
        >
          Check-in
        </button>
      );
    }

    if (status === "occupied") {
      return (
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded mt-2"
          onClick={() => onView(room._id)}
        >
          Ver cuenta
        </button>
      );
    }

    // Terminado el aseo, la habitación vuelve a quedar disponible.
    if (status === "cleaning") {
      return (
        <button
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded mt-2"
          onClick={() => onFinishCleaning(room._id)}
        >
          Terminar aseo
        </button>
      );
    }

    return (
      <button
        className="bg-gray-400 text-white px-3 py-1 rounded mt-2 cursor-not-allowed"
        disabled
      >
        No disponible
      </button>
    );
  };

  return (
    <div className={`border-2 p-4 rounded-xl shadow text-center transition ${getStatusColor()}`}>
      <h2 className="text-lg font-bold">Habitación {room.number}</h2>

      <p className="mt-1 font-semibold">{statusLabel[status] ?? room.status}</p>

      <p className="text-sm text-gray-600">{formatMoney(room.price)} / noche</p>

      {renderButton()}
    </div>
  );
}
