import { publishStayCheckedOut, publishStayProductAdded, publishStayStarted } from "../broker/stay.publisher";
import { ServiceClient } from "../clients/serviceClient";
import { AppError } from "../errors";
import { IStay } from "../models/stay.model";
import { StayRepository } from "../repositories/stay.repository";

interface RoomDto {
  _id: string;
  number: number;
  price: number;
  status: string;
}

interface ProductDto {
  _id: string;
  name: string;
  price: number;
}

const MS_PER_HOUR = 1000 * 60 * 60;

// El precio de una habitación es por noche (24 h); la estancia de mostrador se
// cobra por hora, así que la tarifa horaria es el precio dividido entre 24.
const HOURS_PER_PRICE_UNIT = 24;

export class StayService {
  private readonly stayRepository = new StayRepository();
  private readonly rooms = new ServiceClient(
    process.env.ROOMS_SERVICE_URL || "http://localhost:3001",
    "rooms-service"
  );
  private readonly products = new ServiceClient(
    process.env.PRODUCTS_SERVICE_URL || "http://localhost:3003",
    "products-service"
  );

  async listStays(status?: "active" | "closed") {
    return this.stayRepository.findAll(status);
  }

  async getActiveStay(roomId: string): Promise<IStay> {
    const stay = await this.stayRepository.findActiveByRoomId(roomId);

    if (!stay) {
      throw new AppError(404, "La habitación no tiene una estancia activa");
    }

    return stay;
  }

  async startStay(roomId: string, token: string, userId?: string): Promise<IStay> {
    const room = await this.rooms.request<RoomDto>("GET", `/api/rooms/${roomId}`, token);

    if (room.status !== "available") {
      throw new AppError(400, `La habitación ${room.number} no está disponible (estado: ${room.status})`);
    }

    let stay: IStay;

    try {
      stay = await this.stayRepository.create({
        roomId,
        roomNumber: room.number,
        hourlyRate: Math.round(room.price / HOURS_PER_PRICE_UNIT),
        startedBy: userId
      });
    } catch (error: any) {
      // E11000: el índice único parcial detectó otra estancia activa en la misma habitación.
      if (error?.code === 11000) {
        throw new AppError(409, "La habitación ya tiene una estancia activa");
      }
      throw error;
    }

    try {
      await this.rooms.request("PATCH", `/api/rooms/${roomId}/status`, token, { status: "occupied" });
    } catch (error) {
      // Compensación: sin habitación ocupada no debe quedar una estancia huérfana.
      await this.stayRepository.deleteById(stay._id.toString());
      throw error;
    }

    await publishStayStarted({ stayId: stay._id.toString(), roomId, roomNumber: room.number });

    return stay;
  }

  async addProduct(stayId: string, productId: string, quantity: number, token: string): Promise<IStay> {
    const stay = await this.stayRepository.findById(stayId);

    if (!stay) {
      throw new AppError(404, "Estancia no encontrada");
    }

    if (stay.status !== "active") {
      throw new AppError(400, "La estancia ya fue cerrada");
    }

    const product = await this.products.request<ProductDto>("GET", `/api/products/${productId}`, token);

    // products-service descuenta el stock de forma atómica y responde 400
    // "Stock insuficiente" si no alcanza; ese mensaje llega tal cual al usuario.
    await this.products.request("POST", "/api/inventory/remove", token, {
      productId,
      quantity,
      reason: `Consumo habitación ${stay.roomNumber}`
    });

    const updated = await this.stayRepository.addProduct(stayId, {
      product: { _id: product._id, name: product.name },
      quantity,
      unitPrice: product.price
    });

    if (!updated) {
      // La estancia se cerró entre la lectura y la escritura: se devuelve el stock.
      await this.products
        .request("POST", "/api/inventory/add", token, {
          productId,
          quantity,
          reason: `Reversa consumo habitación ${stay.roomNumber}`
        })
        .catch((error) => console.error("[STAYS] No se pudo revertir el stock:", error));

      throw new AppError(400, "La estancia ya fue cerrada");
    }

    await publishStayProductAdded({
      stayId,
      roomId: stay.roomId,
      roomNumber: stay.roomNumber,
      productId,
      quantity
    });

    return updated;
  }

  async checkout(stayId: string, token: string) {
    const stay = await this.stayRepository.findById(stayId);

    if (!stay) {
      throw new AppError(404, "Estancia no encontrada");
    }

    const endedAt = new Date();
    // Se cobra por hora iniciada y como mínimo una.
    const hours = Math.max(1, Math.ceil((endedAt.getTime() - stay.startedAt.getTime()) / MS_PER_HOUR));
    const roomTotal = Math.round(stay.hourlyRate * hours);
    const productsTotal = stay.products.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const total = roomTotal + productsTotal;

    const closed = await this.stayRepository.close(stayId, { endedAt, hours, roomTotal, productsTotal, total });

    if (!closed) {
      throw new AppError(400, "La estancia ya fue cerrada");
    }

    try {
      await this.rooms.request("PATCH", `/api/rooms/${stay.roomId}/status`, token, { status: "cleaning" });
    } catch (error) {
      // Compensación: si la habitación no pudo pasar a limpieza, la estancia sigue abierta.
      await this.stayRepository.reopen(stayId);
      throw error;
    }

    await publishStayCheckedOut({
      stayId,
      roomId: stay.roomId,
      roomNumber: stay.roomNumber,
      hours,
      roomTotal,
      productsTotal,
      total
    });

    return { stayId, roomNumber: stay.roomNumber, hours, roomTotal, productsTotal, total };
  }
}
