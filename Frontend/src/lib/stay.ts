import type { Stay } from "../types/domain";

// Cuenta "a la fecha" de una estancia abierta. Es la misma regla que aplica stays-service
// al hacer checkout: se cobra por hora iniciada y como mínimo una.
export function accountOf(stay: Stay, now = Date.now()) {
  const hours = Math.max(1, Math.ceil((now - new Date(stay.startedAt).getTime()) / 3_600_000));
  const roomTotal = Math.round(stay.hourlyRate * hours);
  const productsTotal = stay.products.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const items = stay.products.reduce((sum, l) => sum + l.quantity, 0);
  return { hours, roomTotal, productsTotal, items, total: roomTotal + productsTotal };
}

export const ROOM_STATUS: Record<string, { label: string; tone: "ok" | "bal" | "warn" | "mute" }> = {
  available: { label: "Disponible", tone: "ok" },
  occupied: { label: "Ocupada", tone: "bal" },
  cleaning: { label: "En aseo", tone: "warn" },
  maintenance: { label: "Mantenimiento", tone: "mute" },
};

// Los tipos vienen de la base de datos y pueden ser otros (p. ej. "aire"): lo desconocido se muestra capitalizado, nunca undefined.
const withFallback = <T,>(base: Record<string, T>, fallback: (k: string) => T) =>
  new Proxy(base, { get: (t, k) => (typeof k === "string" ? (t[k] ?? fallback(k)) : undefined) });
export const ROOM_TYPE: Record<string, string> = withFallback(
  { individual: "Individual", doble: "Doble", triple: "Triple", suite: "Suite" },
  (k) => k.charAt(0).toUpperCase() + k.slice(1)
);
export const ROOM_CAP: Record<string, number> = withFallback({ individual: 1, doble: 2, triple: 3, suite: 4 }, () => 2);
