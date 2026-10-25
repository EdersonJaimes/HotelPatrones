import {
  publishReservationCancelled,
  publishReservationCheckedIn,
  publishReservationCheckedOut,
  publishReservationConfirmed,
  publishReservationConsumptionAdded,
  publishReservationCreated,
  publishReservationUpdated
} from "../broker/reservation.publisher";
import { ProductsClient } from "../clients/products.client";
import { getReservationChannelFactory } from "../factories/reservationChannel.factory";
import { deserialize, retainedBytes } from "../flyweights/memory.probe";
import { flyweightPoolSizes, LeanReservation, ReservationEntry } from "../flyweights/reservation.flyweight";
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

function toEventPayload(
  reservation: IReservation,
  notification?: { title: string; message: string },
  extra?: Record<string, unknown>
) {
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
    notification,
    ...extra
  };
}

export class ReservationService {
  private readonly reservationRepository = new ReservationRepository();
  private readonly roomSnapshotRepository = new RoomSnapshotRepository();
  private readonly productsClient = new ProductsClient();

  async dashboardSummary(arrivalsLimit: number) {
    return this.reservationRepository.dashboardSummary(arrivalsLimit);
  }

  // Patrón Flyweight: cada reserva se convierte en un contexto (ReservationEntry)
  // que apunta a los flyweights compartidos de su habitación, canal, estado y
  // creador. La fila tiene la forma de siempre, pero esos campos son los mismos
  // objetos en memoria para todas las reservas que los comparten.
  async listReservations() {
    const reservations = await this.reservationRepository.findAllLean();
    return reservations.map((reservation) => new ReservationEntry(reservation).toView());
  }

  // RAM retenida por la respuesta de listReservations() en este proceso, antes
  // y después del Flyweight, con los datos reales de la base. Se mide la fila
  // ya armada más el JSON que envía res.json(): el pico de cada petición.
  async measureListMemory() {
    const raw = await this.reservationRepository.findAllRaw();
    const withJson = (rows: unknown[]) => [rows, JSON.stringify(rows)];

    // Antes: find() hidrataba un documento Mongoose por reserva y se enviaba tal cual.
    const before = retainedBytes(() =>
      withJson(raw.map((buffer) => this.reservationRepository.hydrate(deserialize(buffer))))
    );
    // Paso intermedio: objetos planos, pero cada fila con sus propias copias.
    const leanOnly = retainedBytes(() => withJson(raw.map((buffer) => deserialize(buffer))));
    // Después: objetos planos que comparten los flyweights.
    const after = retainedBytes(() =>
      withJson(raw.map((buffer) => new ReservationEntry(deserialize<LeanReservation>(buffer)).toView()))
    );

    return { rows: raw.length, before, leanOnly, after, shared: flyweightPoolSizes() };
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

    // Se registra la hora REAL de entrada (distinta de checkIn, que es la
    // fecha planeada al crear la reserva). Esto es lo que permite, en el
    // check-out, cobrar por las noches que de verdad transcurrieron.
    const reservation = await this.reservationRepository.updateStatus(id, "checked_in", {
      actualCheckIn: new Date()
    });

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

    const actualCheckOut = new Date();
    const actualCheckIn = current.actualCheckIn ?? current.checkIn;

    // Noches REALES transcurridas (mínimo 1), no las que se habían planeado
    // al crear la reserva. Se reutiliza la MISMA estrategia de precio de su
    // canal (walk-in, phone, online, corporate), así que un descuento
    // corporativo o un recargo online se siguen aplicando igual.
    const nights = Math.max(1, nightsBetween(actualCheckIn, actualCheckOut));
    const factory = getReservationChannelFactory(current.channel);
    const pricing = factory.createPricingStrategy();

    const roomTotal = pricing.calculateTotal({
      basePrice: current.basePrice,
      nights,
      guests: current.guests
    });

    const productsTotal = current.consumptions.reduce((sum, item) => sum + item.subtotal, 0);
    const grandTotal = roomTotal + productsTotal;

    const reservation = await this.reservationRepository.updateStatus(id, "checked_out", {
      actualCheckOut,
      roomTotal,
      productsTotal,
      grandTotal
    });

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationCheckedOut(
      toEventPayload(reservation, undefined, { roomTotal, productsTotal, grandTotal })
    );

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

  async getActiveByRoomId(roomId: string) {
    const reservation = await this.reservationRepository.findActiveByRoomId(roomId);

    if (!reservation) {
      throw new Error("Esta habitación no tiene una reserva con check-in activo");
    }

    return reservation;
  }

  // ---- Flujo de Recepción: click en la habitación → check-in inmediato ----

  async quickCheckin(data: {
    roomId: string;
    clientName: string;
    clientDocument?: string;
    clientPhone?: string;
    guests?: number;
    createdBy?: string;
  }) {
    const now = new Date();
    const estimatedCheckOut = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Reutiliza EXACTAMENTE la misma validación, tarifa (walk-in) y política
    // de cancelación que una reserva creada a mano: no se duplica ninguna
    // regla de negocio, solo se le dan valores por defecto para un huésped
    // que ya está parado frente al mostrador.
    const reservation = await this.createReservation({
      roomId: data.roomId,
      clientName: data.clientName,
      clientDocument: data.clientDocument,
      clientPhone: data.clientPhone,
      checkIn: now.toISOString(),
      checkOut: estimatedCheckOut.toISOString(),
      guests: data.guests ?? 1,
      channel: "walk_in",
      createdBy: data.createdBy
    });

    const id = reservation._id.toString();

    await this.confirmReservation(id);

    // El check-in real registra actualCheckIn = ahora, que es lo que se usa
    // después en checkOut() para cobrar las noches reales, no la estimación.
    return this.checkIn(id);
  }

  async addConsumption(id: string, data: { productId: string; quantity: number }, authorization: string) {
    const current = await this.reservationRepository.findById(id);

    if (!current) {
      throw new Error("Reserva no encontrada");
    }

    if (current.status !== "checked_in") {
      throw new Error("Solo se puede agregar consumo a una reserva con check-in activo");
    }

    const product = await this.productsClient.getProduct(authorization, data.productId);

    // Si no alcanza el stock, products-service responde 400 con un mensaje
    // claro ("Stock insuficiente: disponible X, solicitado Y"); se propaga
    // tal cual, sin registrar nada en la reserva.
    await this.productsClient.removeStock(
      authorization,
      data.productId,
      data.quantity,
      `Consumo habitación ${current.roomNumber} - reserva ${id}`
    );

    const subtotal = product.price * data.quantity;

    const reservation = await this.reservationRepository.addConsumption(id, {
      productId: data.productId,
      name: product.name,
      unitPrice: product.price,
      quantity: data.quantity,
      subtotal,
      addedAt: new Date()
    });

    if (!reservation) {
      throw new Error("Reserva no encontrada");
    }

    await publishReservationConsumptionAdded({
      reservationId: id,
      roomId: current.roomId,
      roomNumber: current.roomNumber,
      productId: data.productId,
      name: product.name,
      quantity: data.quantity,
      subtotal
    });

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
