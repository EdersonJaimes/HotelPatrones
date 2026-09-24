interface Props {
  room: any;
  onStart: (roomId: string) => void;
  onView: (roomId: string) => void;
}

export default function RoomCard({ room, onStart, onView }: Props) {
  const status = room.status?.toLowerCase();

  // 🎨 colores por estado
  const getStatusColor = () => {
    switch (status) {
      case "disponible":
        return "bg-green-200 border-green-500";
      case "ocupado":
        return "bg-red-200 border-red-500";
      case "limpieza":
        return "bg-yellow-200 border-yellow-500";
      case "mantenimiento":
        return "bg-gray-300 border-gray-600";
      default:
        return "bg-white";
    }
  };

  // 🟢 botón dinámico
  const renderButton = () => {
    if (status === "disponible") {
      return (
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded mt-2"
          onClick={() => onStart(room._id)}
        >
          Iniciar
        </button>
      );
    }

    if (status === "ocupado") {
      return (
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded mt-2"
          onClick={() => onView(room._id)}
        >
          Gestionar
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
    <div
      className={`border-2 p-4 rounded-xl shadow text-center transition ${getStatusColor()}`}
    >
      <h2 className="text-lg font-bold">
        Habitación {room.number}
      </h2>

      <p className="mt-2 font-semibold capitalize">
        {room.status}
      </p>

      {renderButton()}
    </div>
  );
}