const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const pad = (n: number) => String(n).padStart(2, "0");

export const fmt = (n: number | null | undefined) => "$ " + Math.round(n ?? 0).toLocaleString("es-CO");

export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString("es-CO");

// "13 oct, 15:00"
export function fdate(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "13 oct 2026"
export function fday(value: string | Date | undefined | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Valor para <input type="datetime-local"> (hora local, sin zona).
export function toLocalInput(value: string | Date): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const initials = (name?: string) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Igual que reservations-service: cada noche iniciada cuenta completa.
export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(checkOut) - Date.parse(checkIn);
  if (isNaN(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export const plural = (n: number | null | undefined, one: string, many: string) => `${(n ?? 0).toLocaleString("es-CO")} ${n === 1 ? one : many}`;

export function kb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const ms = (value: number) => (value < 10 ? value.toFixed(1) : Math.round(value).toString()) + " ms";

// Mensaje legible de un error de axios (el backend responde { message }).
export function errMsg(error: unknown, fallback = "Ocurrió un error"): string {
  const e = error as { response?: { data?: { message?: string; errors?: { msg?: string }[] } }; message?: string };
  const data = e?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors?.[0]?.msg) return data.errors[0].msg ?? fallback;
  if (e?.message === "Network Error") return "No hay conexión con el api-gateway.";
  return fallback;
}
