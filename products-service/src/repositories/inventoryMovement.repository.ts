import { IInventoryMovement, InventoryMovement, MovementType } from "../models/inventoryMovement.model";

export interface CreateMovementData {
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reason?: string;
}

export class InventoryMovementRepository {
  async create(data: CreateMovementData): Promise<IInventoryMovement> {
    return InventoryMovement.create(data);
  }

  async findByProductId(productId: string): Promise<IInventoryMovement[]> {
    return InventoryMovement.find({ productId }).sort({ date: -1 });
  }

  // Kardex general: los últimos N movimientos de todos los productos.
  async findRecent(limit: number): Promise<IInventoryMovement[]> {
    return InventoryMovement.find().sort({ date: -1 }).limit(limit);
  }

  // Suma las salidas (consumo) por producto y devuelve el top N.
  // Forma de salida ({_id, name, total}) pensada para calzar tal cual con lo que
  // espera Dashboard.tsx del frontend. El nombre sale del propio movimiento
  // (productName), así se conserva aunque el producto se haya borrado después.
  async aggregateTopConsumed(
    limit: number
  ): Promise<Array<{ _id: string; name: string; total: number }>> {
    const rows = await InventoryMovement.aggregate([
      { $match: { type: "OUT" } },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: "$productId",
          name: { $last: "$productName" },
          total: { $sum: "$quantity" }
        }
      },
      { $sort: { total: -1 } },
      { $limit: limit }
    ]);

    return rows.map((row) => ({ _id: String(row._id), name: row.name, total: row.total }));
  }
}
