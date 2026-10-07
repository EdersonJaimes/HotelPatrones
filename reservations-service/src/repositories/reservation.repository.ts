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
  async findAll(): Promise<IReservation[]> {
    return Reservation.find().sort({ checkIn: 1 });
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
