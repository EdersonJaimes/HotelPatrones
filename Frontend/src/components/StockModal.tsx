import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, reason: string) => void;
  type: "add" | "remove";
}

export default function StockModal({
  isOpen,
  onClose,
  onSubmit,
  type,
}: Props) {
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl w-80">
        <h2 className="text-xl font-bold mb-4">
          {type === "add" ? "Agregar stock" : "Descontar stock"}
        </h2>

        <input
          type="number"
          placeholder="Cantidad"
          className="w-full border p-2 mb-3"
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <input
          type="text"
          placeholder="Motivo"
          className="w-full border p-2 mb-3"
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancelar</button>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded"
            onClick={() => onSubmit(quantity, reason)}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}