import { ReservationChannel } from "../models/reservation.model";

/**
 * Abstract Factory
 * -----------------
 * Cada canal de reserva (walk_in, phone, online, corporate) define una
 * "familia" de reglas de negocio que deben variar juntas y de forma
 * consistente: cómo se tarifa, cuál es la política de cancelación, y cómo se
 * redacta la notificación que viaja en el evento de RabbitMQ. En vez de
 * resolver cada regla con un `switch(channel)` disperso por el código, se
 * declara una fábrica abstracta con un método de creación por producto, y
 * una fábrica concreta por canal que garantiza que los 3 productos
 * pertenecen a la misma familia.
 */

export interface PricingStrategy {
  calculateTotal(input: { basePrice: number; nights: number; guests: number }): number;
}

export interface CancellationPolicy {
  getDeadline(checkIn: Date): Date;
  calculatePenalty(input: { total: number; hoursBeforeCheckIn: number }): number;
}

export interface ReservationNotification {
  title: string;
  message: string;
}

export interface ReservationNotificationBuilder {
  buildCreated(input: {
    clientName: string;
    roomNumber: number;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
  }): ReservationNotification;

  buildCancelled(input: {
    clientName: string;
    roomNumber: number;
    penalty: number;
  }): ReservationNotification;
}

export abstract class ReservationChannelFactory {
  abstract createPricingStrategy(): PricingStrategy;
  abstract createCancellationPolicy(): CancellationPolicy;
  abstract createNotificationBuilder(): ReservationNotificationBuilder;
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Familia: Walk-in (reserva tomada en el mostrador, huésped ya está en el hotel)
// ---------------------------------------------------------------------------

class WalkInPricingStrategy implements PricingStrategy {
  calculateTotal({ basePrice, nights }: { basePrice: number; nights: number; guests: number }): number {
    return basePrice * nights;
  }
}

class WalkInCancellationPolicy implements CancellationPolicy {
  getDeadline(checkIn: Date): Date {
    return new Date(checkIn.getTime() - hoursToMs(2));
  }

  calculatePenalty({ total, hoursBeforeCheckIn }: { total: number; hoursBeforeCheckIn: number }): number {
    return hoursBeforeCheckIn < 2 ? total : 0;
  }
}

class WalkInNotificationBuilder implements ReservationNotificationBuilder {
  buildCreated({ clientName, roomNumber, totalPrice }: { clientName: string; roomNumber: number; checkIn: Date; checkOut: Date; totalPrice: number }): ReservationNotification {
    return {
      title: "Reserva registrada en recepción",
      message: `${clientName} - Habitación ${roomNumber} registrada en mostrador por $${totalPrice}`
    };
  }

  buildCancelled({ clientName, roomNumber, penalty }: { clientName: string; roomNumber: number; penalty: number }): ReservationNotification {
    return {
      title: "Reserva de mostrador cancelada",
      message: `${clientName} - Habitación ${roomNumber} cancelada${penalty > 0 ? ` con penalidad de $${penalty}` : ""}`
    };
  }
}

class WalkInChannelFactory extends ReservationChannelFactory {
  createPricingStrategy(): PricingStrategy {
    return new WalkInPricingStrategy();
  }

  createCancellationPolicy(): CancellationPolicy {
    return new WalkInCancellationPolicy();
  }

  createNotificationBuilder(): ReservationNotificationBuilder {
    return new WalkInNotificationBuilder();
  }
}

// ---------------------------------------------------------------------------
// Familia: Phone (reserva telefónica estándar)
// ---------------------------------------------------------------------------

class PhonePricingStrategy implements PricingStrategy {
  calculateTotal({ basePrice, nights }: { basePrice: number; nights: number; guests: number }): number {
    return basePrice * nights;
  }
}

class PhoneCancellationPolicy implements CancellationPolicy {
  getDeadline(checkIn: Date): Date {
    return new Date(checkIn.getTime() - hoursToMs(12));
  }

  calculatePenalty({ total, hoursBeforeCheckIn }: { total: number; hoursBeforeCheckIn: number }): number {
    return hoursBeforeCheckIn < 12 ? total * 0.1 : 0;
  }
}

class PhoneNotificationBuilder implements ReservationNotificationBuilder {
  buildCreated({ clientName, roomNumber, checkIn, checkOut, totalPrice }: { clientName: string; roomNumber: number; checkIn: Date; checkOut: Date; totalPrice: number }): ReservationNotification {
    return {
      title: "Reserva telefónica confirmada",
      message: `${clientName} reservó la habitación ${roomNumber} del ${checkIn.toLocaleDateString()} al ${checkOut.toLocaleDateString()} por $${totalPrice}`
    };
  }

  buildCancelled({ clientName, roomNumber, penalty }: { clientName: string; roomNumber: number; penalty: number }): ReservationNotification {
    return {
      title: "Reserva telefónica cancelada",
      message: `${clientName} canceló la habitación ${roomNumber}${penalty > 0 ? ` - penalidad de $${penalty}` : ""}`
    };
  }
}

class PhoneChannelFactory extends ReservationChannelFactory {
  createPricingStrategy(): PricingStrategy {
    return new PhonePricingStrategy();
  }

  createCancellationPolicy(): CancellationPolicy {
    return new PhoneCancellationPolicy();
  }

  createNotificationBuilder(): ReservationNotificationBuilder {
    return new PhoneNotificationBuilder();
  }
}

// ---------------------------------------------------------------------------
// Familia: Online (reserva por la web, con recargo por gestión y política más
// estricta para compensar el mayor riesgo de no-show)
// ---------------------------------------------------------------------------

class OnlinePricingStrategy implements PricingStrategy {
  private static readonly SERVICE_FEE_RATE = 0.05;

  calculateTotal({ basePrice, nights }: { basePrice: number; nights: number; guests: number }): number {
    const subtotal = basePrice * nights;
    return subtotal + subtotal * OnlinePricingStrategy.SERVICE_FEE_RATE;
  }
}

class OnlineCancellationPolicy implements CancellationPolicy {
  getDeadline(checkIn: Date): Date {
    return new Date(checkIn.getTime() - hoursToMs(24));
  }

  calculatePenalty({ total, hoursBeforeCheckIn }: { total: number; hoursBeforeCheckIn: number }): number {
    return hoursBeforeCheckIn < 24 ? total * 0.2 : 0;
  }
}

class OnlineNotificationBuilder implements ReservationNotificationBuilder {
  buildCreated({ clientName, roomNumber, checkIn, checkOut, totalPrice }: { clientName: string; roomNumber: number; checkIn: Date; checkOut: Date; totalPrice: number }): ReservationNotification {
    return {
      title: "Reserva online confirmada",
      message: `Hola ${clientName}, tu habitación ${roomNumber} está reservada del ${checkIn.toLocaleDateString()} al ${checkOut.toLocaleDateString()}. Total (incluye cargo por servicio): $${totalPrice}`
    };
  }

  buildCancelled({ clientName, roomNumber, penalty }: { clientName: string; roomNumber: number; penalty: number }): ReservationNotification {
    return {
      title: "Reserva online cancelada",
      message: `${clientName}, tu reserva de la habitación ${roomNumber} fue cancelada${penalty > 0 ? `. Se aplicó una penalidad de $${penalty} según nuestra política de cancelación online` : ""}`
    };
  }
}

class OnlineChannelFactory extends ReservationChannelFactory {
  createPricingStrategy(): PricingStrategy {
    return new OnlinePricingStrategy();
  }

  createCancellationPolicy(): CancellationPolicy {
    return new OnlineCancellationPolicy();
  }

  createNotificationBuilder(): ReservationNotificationBuilder {
    return new OnlineNotificationBuilder();
  }
}

// ---------------------------------------------------------------------------
// Familia: Corporate (convenio empresarial, con descuento y mayor flexibilidad)
// ---------------------------------------------------------------------------

class CorporatePricingStrategy implements PricingStrategy {
  private static readonly CORPORATE_DISCOUNT_RATE = 0.1;

  calculateTotal({ basePrice, nights }: { basePrice: number; nights: number; guests: number }): number {
    const subtotal = basePrice * nights;
    return subtotal - subtotal * CorporatePricingStrategy.CORPORATE_DISCOUNT_RATE;
  }
}

class CorporateCancellationPolicy implements CancellationPolicy {
  getDeadline(checkIn: Date): Date {
    return new Date(checkIn.getTime() - hoursToMs(72));
  }

  calculatePenalty({ total, hoursBeforeCheckIn }: { total: number; hoursBeforeCheckIn: number }): number {
    return hoursBeforeCheckIn < 72 ? total * 0.1 : 0;
  }
}

class CorporateNotificationBuilder implements ReservationNotificationBuilder {
  buildCreated({ clientName, roomNumber, checkIn, checkOut, totalPrice }: { clientName: string; roomNumber: number; checkIn: Date; checkOut: Date; totalPrice: number }): ReservationNotification {
    return {
      title: "Reserva corporativa confirmada",
      message: `Convenio corporativo: ${clientName} - habitación ${roomNumber} del ${checkIn.toLocaleDateString()} al ${checkOut.toLocaleDateString()}. Total con tarifa corporativa: $${totalPrice}`
    };
  }

  buildCancelled({ clientName, roomNumber, penalty }: { clientName: string; roomNumber: number; penalty: number }): ReservationNotification {
    return {
      title: "Reserva corporativa cancelada",
      message: `Convenio corporativo: ${clientName} canceló la habitación ${roomNumber}${penalty > 0 ? ` - penalidad de $${penalty}` : ""}`
    };
  }
}

class CorporateChannelFactory extends ReservationChannelFactory {
  createPricingStrategy(): PricingStrategy {
    return new CorporatePricingStrategy();
  }

  createCancellationPolicy(): CancellationPolicy {
    return new CorporateCancellationPolicy();
  }

  createNotificationBuilder(): ReservationNotificationBuilder {
    return new CorporateNotificationBuilder();
  }
}

const factories: Record<ReservationChannel, ReservationChannelFactory> = {
  walk_in: new WalkInChannelFactory(),
  phone: new PhoneChannelFactory(),
  online: new OnlineChannelFactory(),
  corporate: new CorporateChannelFactory()
};

export function getReservationChannelFactory(channel: ReservationChannel): ReservationChannelFactory {
  return factories[channel];
}
