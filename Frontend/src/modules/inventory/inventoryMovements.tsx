import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import { getMovements } from "../../services/inventoryService";
import { movementColumns } from "../inventory/inventory.config";
import { InventoryMovement } from "./inventory.types";

interface Props {
  productId: string;
  onClose: () => void;
}

export default function InventoryMovements({
  productId,
  onClose,
}: Props) {
  const [data, setData] = useState<InventoryMovement[]>([]);

  const loadData = async () => {
    const res = await getMovements(productId);
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">

      <div className="bg-white p-6 rounded shadow w-3/4">
        <h2 className="text-xl font-bold mb-4">
          Movimientos de Inventario
        </h2>

        <DataTable data={data} columns={movementColumns} />

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>

    </div>
  );
}