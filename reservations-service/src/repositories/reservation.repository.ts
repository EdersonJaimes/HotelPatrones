import { LeanReservation } from "../flyweights/reservation.flyweight";
import {
  IReservation,
  IReservationConsumption,
  Reservation,
  ReservationChannel,
  ReservationStatus
} from "../models/reservation.model";

export interface ReservationStatusExtra {
  cancellationPenalty?: number;
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  roomTotal?: number;
  productsTotal?: number;
  grandTotal?: number;
}

export interface CreateReservationData {
  roomId: string;
  roomNumber: number;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  channel: ReservationChannel;
  status: ReservationStatus;
  basePrice: number;
  totalPrice: number;
  cancellationDeadline: Date;
  notes?: string;
  createdBy?: string;
}

export interface UpdateReservationData {
  clientName?: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  basePrice?: number;
  totalPrice?: number;
  cancellationDeadline?: Date;
  notes?: string;
}

const ACTIVE_STATUSES: ReservationStatus[] = ["pending", "confirmed", "checked_in"];

export class ReservationRepository {
  // Resumen para el Dashboard: reservas vigentes y próximas llegadas, sin traer todas.
  async dashboardSummary(arrivalsLimit: number) {
    const [active, arrivals] = await Promise.all([
      Reservation.countDocuments({ status: { $in: ["pending", "confirmed", "checked_in"] } }),
      Reservation.find({ status: { $in: ["pending", "confirmed"] }, checkIn: { $gte: new Date() } })
        .sort({ checkIn: 1 })
        .limit(arrivalsLimit)
        .select("clientName roomNumber checkIn status")
        .lean()
    ]);

    return { active, arrivals };
  }

  // Objetos planos (.lean()): un documento Mongoose guarda su propia copia de
  // todo; el Flyweight necesita que la fila quede solo con su estado extrínseco.
  async findAllLean(): Promise<LeanReservation[]> {
    return Reservation.find().sort({ checkIn: 1 }).lean<LeanReservation[]>();
  }

  // Los documentos tal como llegan de Mongo, sin deserializar (para medir la RAM).
  async findAllRaw(): Promise<Buffer[]> {
    const raw = await Reservation.collection.find({}, { raw: true, sort: { checkIn: 1 } }).toArray();
    return raw as unknown as Buffer[];
  }

  hydrate(document: object): IReservation {
    return Reservation.hydrate(document);
  }

  async findById(id: string): Promise<IReservation | null> {
    return Reservation.findById(id);
  }

  // Usado por Recepción para abrir la "cuenta" de una habitación ocupada.
  async findActiveByRoomId(roomId: string): Promise<IReservation | null> {
    return Reservation.findOne({ roomId, status: "checked_in" });
  }

  async findOverlapping(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeId?: string
  ): Promise<IReservation | null> {
    const query: Record<string, unknown> = {
      roomId,
      status: { $in: ACTIVE_STATUSES },
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn }
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    return Reservation.findOne(query);
  }

  async create(data: CreateReservationData): Promise<IReservation> {
    return Reservation.create(data);
  }

  async update(id: string, data: UpdateReservationData): Promise<IReservation | null> {
    return Reservation.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    extra?: ReservationStatusExtra
  ): Promise<IReservation | null> {
    return Reservation.findByIdAndUpdate(
      id,
      { status, ...extra },
      { returnDocument: "after", runValidators: true }
    );
  }

  // Atómico: el $push solo se aplica si la reserva SIGUE en checked_in en el
  // momento exacto de la escritura (protege contra una carrera con un
  // check-out que ocurra justo entre la validación del service y este write).
  async addConsumption(
    id: string,
    consumption: IReservationConsumption
  ): Promise<IReservation | null> {
    return Reservation.findOneAndUpdate(
      { _id: id, status: "checked_in" },
      { $push: { consumptions: consumption } },
      { returnDocument: "after", runValidators: true }
    );
  }

  async deleteById(id: string): Promise<IReservation | null> {
    return Reservation.findByIdAndDelete(id);
  }
}
