import { fdate, fmt } from "../../lib/format";
import type { Reservation, ReservationChannel, ReservationStatus } from "../../types/domain";

// Reglas por canal. Reproducen la Abstract Factory de reservations-service
// (reservationChannel.factory.ts): tarifa, plazo de cancelación y penalidad.
export const CHANNELS: Record<ReservationChannel, { label: string; rate: number; rateText: string; hours: number; pct: number }> = {
  walk_in: { label: "Mostrador", rate: 1, rateText: "", hours: 2, pct: 1 },
  phone: { label: "Teléfono", rate: 1, rateText: "", hours: 12, pct: 0.1 },
  online: { label: "Online", rate: 1.05, rateText: " + 5 % de cargo online", hours: 24, pct: 0.2 },
  corporate: { label: "Corporativo", rate: 0.9, rateText: " − 10 % de descuento corporativo", hours: 72, pct: 0.1 },
};

export const CHANNEL_KEYS = Object.keys(CHANNELS) as ReservationChannel[];

export const RES_STATUS: Record<ReservationStatus, { label: string; tone: "warn" | "info" | "ok" | "mute" | "err" }> = {
  pending: { label: "Pendiente", tone: "warn" },
  confirmed: { label: "Confirmada", tone: "info" },
  checked_in: { label: "En casa", tone: "ok" },
  checked_out: { label: "Finalizada", tone: "mute" },
  cancelled: { label: "Cancelada", tone: "err" },
};

export const deadlineOf = (r: Pick<Reservation, "checkIn" | "channel">) =>
  new Date(Date.parse(r.checkIn) - CHANNELS[r.channel].hours * 3_600_000);

// Penalidad si se cancelara ahora (el servicio calcula la definitiva al cancelar).
export function penaltyNow(r: Pick<Reservation, "checkIn" | "channel" | "totalPrice">): number {
  const hoursBefore = Math.max(0, (Date.parse(r.checkIn) - Date.now()) / 3_600_000);
  const c = CHANNELS[r.channel];
  return hoursBefore < c.hours ? r.totalPrice * c.pct : 0;
}

export function policyText(channel: ReservationChannel): string {
  const c = CHANNELS[channel];
  return c.pct === 1
    ? `Cancelación gratis hasta ${c.hours} horas antes de la llegada; después se cobra el total.`
    : `Cancelación gratis hasta ${c.hours} horas antes de la llegada; después se cobra el ${Math.round(c.pct * 100)} %.`;
}

// Nota de política que se muestra en el detalle y al cancelar.
export function policyNote(r: Reservation): { tone: "err" | "info" | "warn" | "ok"; text: string } {
  const c = CHANNELS[r.channel];
  if (r.status === "cancelled")
    return { tone: "err", text: r.cancellationPenalty ? `Cancelada con penalidad de ${fmt(r.cancellationPenalty)}.` : "Cancelada sin penalidad." };
  if (r.status === "checked_in" || r.status === "checked_out")
    return { tone: "info", text: "La política de cancelación ya no aplica: el huésped llegó." };
  const dl = fdate(deadlineOf(r));
  return penaltyNow(r)
    ? { tone: "warn", text: `El plazo para cancelar gratis venció el ${dl}. Si cancela ahora se cobra el ${Math.round(c.pct * 100)} %.` }
    : { tone: "ok", text: `Puede cancelar gratis hasta el ${dl}.` };
}

