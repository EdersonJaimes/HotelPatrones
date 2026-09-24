import { IReservation, Reservation, ReservationChannel, ReservationStatus } from "../models/reservation.model";

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
    extra?: { cancellationPenalty?: number }
  ): Promise<IReservation | null> {
    return Reservation.findByIdAndUpdate(
      id,
      { status, ...extra },
      { returnDocument: "after", runValidators: true }
    );
  }

  async deleteById(id: string): Promise<IReservation | null> {
    return Reservation.findByIdAndDelete(id);
  }
}
