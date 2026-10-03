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

  // Suma las salidas (consumo) por producto y devuelve el top N.
  // Forma de salida ({_id, total}) pensada para calzar tal cual con lo que
  // espera Dashboard.tsx del frontend.
  async aggregateTopConsumed(limit: number): Promise<Array<{ _id: string; total: number }>> {
    const rows = await InventoryMovement.aggregate([
      { $match: { type: "OUT" } },
      { $group: { _id: "$productId", total: { $sum: "$quantity" } } },
      { $sort: { total: -1 } },
      { $limit: limit }
    ]);

    return rows.map((row) => ({ _id: String(row._id), total: row.total }));
  }
}
