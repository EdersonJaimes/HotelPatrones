import { IStay, IStayProduct, Stay } from "../models/stay.model";

export class StayRepository {
  create(data: Partial<IStay>): Promise<IStay> {
    return Stay.create(data);
  }

  findById(id: string): Promise<IStay | null> {
    return Stay.findById(id);
  }

  findActiveByRoomId(roomId: string): Promise<IStay | null> {
    return Stay.findOne({ roomId, status: "active" });
  }

  findAll(status?: "active" | "closed"): Promise<IStay[]> {
    return Stay.find(status ? { status } : {}).sort({ startedAt: -1 });
  }

  deleteById(id: string): Promise<IStay | null> {
    return Stay.findByIdAndDelete(id);
  }

  // Solo agrega el consumo si la estancia sigue activa (si ya se cerró, devuelve null).
  addProduct(id: string, line: IStayProduct): Promise<IStay | null> {
    return Stay.findOneAndUpdate(
      { _id: id, status: "active" },
      { $push: { products: line } },
      { new: true }
    );
  }

  // Cierre atómico: solo una petición puede pasar de "active" a "closed",
  // así un doble clic en Checkout no cobra dos veces.
  close(
    id: string,
    bill: { endedAt: Date; hours: number; roomTotal: number; productsTotal: number; total: number }
  ): Promise<IStay | null> {
    return Stay.findOneAndUpdate(
      { _id: id, status: "active" },
      { $set: { status: "closed", ...bill } },
      { new: true }
    );
  }

  // Compensación: reabre una estancia cuyo cierre no pudo completarse.
  reopen(id: string): Promise<IStay | null> {
    return Stay.findOneAndUpdate(
      { _id: id, status: "closed" },
      {
        $set: { status: "active" },
        $unset: { endedAt: "", hours: "", roomTotal: "", productsTotal: "", total: "" }
      },
      { new: true }
    );
  }
}
