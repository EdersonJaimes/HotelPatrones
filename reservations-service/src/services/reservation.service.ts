import {
  publishReservationCancelled,
  publishReservationCheckedIn,
  publishReservationCheckedOut,
  publishReservationConfirmed,
  publishReservationCreated,
  publishReservationUpdated
} from "../broker/reservation.publisher";
import { getReservationChannelFactory } from "../factories/reservationChannel.factory";
import { IReservation, ReservationChannel } from "../models/reservation.model";
import { ReservationRepository } from "../repositories/reservation.repository";
import { RoomSnapshotRepository } from "../repositories/roomSnapshot.repository";

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const msPerNight = 1000 * 60 * 60 * 24;
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerNight);
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}

function toEventPayload(reservation: IReservation, notification?: { title: string; message: string }) {
  return {
    reservationId: reservation._id.toString(),
    roomId: reservation.roomId,
    roomNumber: reservation.roomNumber,
    clientName: reservation.clientName,
    checkIn: reservation.checkIn.toISOString(),
    checkOut: reservation.checkOut.toISOString(),
    channel: reservation.channel,
    status: reservation.status,
    totalPrice: reservation.totalPrice,
    notification
  };
}

export class ReservationService {
  private readonly reservationRepository = new ReservationRepository();
  private readonly roomSnapshotRepository = new RoomSnapshotRepository();

  async listReservations() {
    return this.reservationRepository.findAll();
  }

  async getReservationById(id: string) {
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    return reservation;
  }

  async createReservation(data: {
    roomId: string;
    clientName: string;
    clientDocument?: string;
    clientPhone?: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    channel: ReservationChannel;
    notes?: string;
    createdBy?: string;
  }) {
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (checkOut <= checkIn) {
      throw new Error("La fecha de check-out debe ser posterior a la de check-in");
    }

    const room = await this.roomSnapshotRepository.findByRoomId(data.roomId);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    if (room.status === "maintenance") {
      throw new Error("La habitación está en mantenimiento y no puede reservarse");
    }

    if (data.guests > room.capacity) {
      throw new Error(`La habitación admite un máximo de ${room.capacity} huéspedes`);
    }

    const overlapping = await this.reservationRepository.findOverlapping(data.roomId, checkIn, checkOut);

    if (overlapping) {
      throw new Error("La habitación ya tiene una reserva activa para esas fechas");
    }

    const factory = getReservationChannelFactory(data.channel);
    const pricing = factory.createPricingStrategy();
    const cancellationPolicy = factory.createCancellationPolicy();
    const notifier = factory.createNotificationBuilder();

    const nights = nightsBetween(checkIn, checkOut);
    const totalPrice = pricing.calculateTotal({ basePrice: room.price, nights, guests: data.guests });
    const cancellationDeadline = cancellationPolicy.getDeadline(checkIn);

    const reservation = await this.reservationRepository.create({
      roomId: data.roomId,
      roomNumber: room.number,
      clientName: data.clientName,
      clientDocument: data.clientDocument,
      clientPhone: data.clientPhone,
      checkIn,
      checkOut,
      guests: data.guests,
      channel: data.channel,
      status: "pending",
      basePrice: room.price,
      totalPrice,
      cancellationDeadline,
      notes: data.notes,
      createdBy: data.createdBy
    });

    const notification = notifier.buildCreated({
      clientName: reservation.clientName,
      roomNumber: reservation.roomNumber,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      totalPrice: reservation.totalPrice
    });

    await publishReservationCreated(toEventPayload(reservation, notification));

    return reservation;
  }

  async updateReservation(
    id: string,
    data: {
      clientName?: string;
      clientDocument?: string;
      clientPhone?: string;
      checkIn?: string;
      checkOut?: string;
      guests?: number;
      notes?: string;
    }
  ) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status !== "pending") {
      throw new Error("Solo se puede editar una reserva mientras está pendiente");
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : current.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut) : current.checkOut;

    if (checkOut <= checkIn) {
      throw new Error("La fecha de check-out debe ser posterior a la de check-in");
    }

    const room = await this.roomSnapshotRepository.findByRoomId(current.roomId);

    if (!room) {
      throw new Error("Habitación no encontrada");
    }

    const guests = data.guests ?? current.guests;

    if (guests > room.capacity) {
      throw new Error(`La habitación admite un máximo de ${room.capacity} huéspedes`);
    }

    if (data.checkIn || data.checkOut) {
      const overlapping = await this.reservationRepository.findOverlapping(current.roomId, checkIn, checkOut, id);

      if (overlapping) {
        throw new Error("La habitación ya tiene una reserva activa para esas fechas");
      }
    }

    const factory = getReservationChannelFactory(current.channel);
    const pricing = factory.createPricingStrategy();
    const cancellationPolicy = factory.createCancellationPolicy();

    const nights = nightsBetween(checkIn, checkOut);
    const totalPrice = pricing.calculateTotal({ basePrice: room.price, nights, guests });
    const cancellationDeadline = cancellationPolicy.getDeadline(checkIn);

    const reservation = await this.reservationRepository.update(id, {
      clientName: data.clientName,
      clientDocument: data.clientDocument,
      clientPhone: data.clientPhone,
      checkIn,
      checkOut,
      guests,
      basePrice: room.price,
      totalPrice,
      cancellationDeadline,
      notes: data.notes
    });

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationUpdated(toEventPayload(reservation));

    return reservation;
  }

  async confirmReservation(id: string) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status !== "pending") {
      throw new Error("Solo se puede confirmar una reserva pendiente");
    }

    const reservation = await this.reservationRepository.updateStatus(id, "confirmed");

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationConfirmed(toEventPayload(reservation));

    return reservation;
  }

  async checkIn(id: string) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status !== "confirmed") {
      throw new Error("Solo se puede hacer check-in a una reserva confirmada");
    }

    const reservation = await this.reservationRepository.updateStatus(id, "checked_in");

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationCheckedIn(toEventPayload(reservation));

    return reservation;
  }

  async checkOut(id: string) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status !== "checked_in") {
      throw new Error("Solo se puede hacer check-out de una reserva con check-in activo");
    }

    const reservation = await this.reservationRepository.updateStatus(id, "checked_out");

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationCheckedOut(toEventPayload(reservation));

    return reservation;
  }

  async cancelReservation(id: string) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status === "cancelled" || current.status === "checked_out") {
      throw new Error("La reserva ya no puede cancelarse");
    }

    const factory = getReservationChannelFactory(current.channel);
    const cancellationPolicy = factory.createCancellationPolicy();
    const notifier = factory.createNotificationBuilder();

    const hoursBeforeCheckIn = Math.max(0, hoursBetween(new Date(), current.checkIn));
    const penalty = cancellationPolicy.calculatePenalty({
      total: current.totalPrice,
      hoursBeforeCheckIn
    });

    const reservation = await this.reservationRepository.updateStatus(id, "cancelled", {
      cancellationPenalty: penalty
    });

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    const notification = notifier.buildCancelled({
      clientName: reservation.clientName,
      roomNumber: reservation.roomNumber,
      penalty
    });

    await publishReservationCancelled(toEventPayload(reservation, notification));

    return reservation;
  }

  async deleteReservation(id: string) {
    const reservation = await this.reservationRepository.deleteById(id);

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    return reservation;
  }
}
