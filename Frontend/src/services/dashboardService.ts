import { perfMark, perfSince, type PerfEntry } from "../lib/perf";
import type { InventoryRow, Reservation, Room, RoomStatus } from "../types/domain";
import { LOW_STOCK } from "../types/domain";
import api from "./api";

export interface DashboardStats {
  clients: number | null;
  roomsOccupied: number | null;
  lowStock: number | null;
  topProducts: { _id: string; name?: string; total: number }[];
  rooms: { _id: string; number: number; status: RoomStatus }[];
  lowStockItems: { _id: string; name: string; stock: number }[];
  reservations: {
    active: number;
    arrivals: { _id: string; clientName: string; roomNumber: number; checkIn: string; status: string }[];
  } | null;
  warnings?: string[];
}

export type DashboardMode = "facade" | "directo";

export interface StatsResult {
  stats: DashboardStats;
  requests: number; // peticiones HTTP que hizo el navegador
  ms: number; // tiempo total medido en el navegador
  bytes: number; // datos descargados por el navegador
  entries: PerfEntry[]; // cada petición, para la cascada de tiempos
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Latencia simulada por petición navegador <-> gateway (como en docs/presentacion/medir-tiempos.js):
// en localhost todo es casi instantáneo y no se nota la diferencia entre 1 y 5 viajes.
async function get<T>(path: string, rtt: number, params?: Record<string, unknown>): Promise<T> {
  if (rtt > 0) await sleep(rtt);
  return (await api.get(path, { params })).data;
}

async function measure(run: () => Promise<DashboardStats>): Promise<StatsResult> {
  const mark = perfMark();
  const t0 = performance.now();
  const stats = await run();
  const ms = performance.now() - t0;
  const sum = perfSince(mark, t0);
  return { stats, requests: sum.requests, ms, bytes: sum.bytes, entries: sum.entries };
}

// ✅ CON FACADE: el navegador hace UNA petición. El gateway consulta rooms, products,
// clients y reservations por la red interna y devuelve el objeto ya combinado.
export const getStatsFacade = (rtt = 0): Promise<StatsResult> =>
  measure(() => get<DashboardStats>("/dashboard/stats", rtt));

// Une lo que trajeron los 5 servicios. Es la misma lógica que hace DashboardFacade en el
// gateway, pero aquí la tiene que repetir (y conocer) el navegador.
function combine(
  rooms: Room[],
  inventory: InventoryRow[],
  top: { _id: string; total: number }[],
  clients: unknown[],
  reservations: Reservation[]
): DashboardStats {
  const names = new Map(inventory.map((row) => [String(row.product._id), row.product.name]));
  const low = inventory.filter((row) => row.stock <= LOW_STOCK);
  const now = Date.now();

  return {
    clients: clients.length,
    roomsOccupied: rooms.filter((r) => r.status === "occupied").length,
    lowStock: low.length,
    topProducts: top.map((item) => ({ ...item, name: names.get(String(item._id)) ?? String(item._id) })),
    rooms: rooms.map((r) => ({ _id: r._id, number: r.number, status: r.status })),
    lowStockItems: low
      .slice()
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((row) => ({ _id: String(row.product._id), name: row.product.name, stock: row.stock })),
    reservations: {
      active: reservations.filter((r) => ["pending", "confirmed", "checked_in"].includes(r.status)).length,
      arrivals: reservations
        .filter((r) => ["pending", "confirmed"].includes(r.status) && new Date(r.checkIn).getTime() >= now)
        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
        .slice(0, 5)
        .map((r) => ({ _id: r._id, clientName: r.clientName, roomNumber: r.roomNumber, checkIn: r.checkIn, status: r.status })),
    },
  };
}

// ❌ SIN FACADE (solo para la demo): el navegador debe conocer cada servicio, pedir los
// 5 recursos y combinarlos él mismo. Las 5 peticiones van en paralelo (el caso más favorable).
export const getStatsDirect = (rtt = 0): Promise<StatsResult> =>
  measure(async () => {
    const [rooms, inventory, top, clients, reservations] = await Promise.all([
      get<Room[]>("/rooms", rtt),
      get<InventoryRow[]>("/inventory", rtt),
      get<{ _id: string; total: number }[]>("/inventory/top-consumed", rtt, { limit: 5 }),
      get<unknown[]>("/clients", rtt),
      get<Reservation[]>("/reservations", rtt),
    ]);
    return combine(rooms, inventory, top, clients, reservations);
  });

// Peor caso: código ingenuo con await en serie (una petición tras otra).
export const getStatsDirectSerie = (rtt = 0): Promise<StatsResult> =>
  measure(async () => {
    const rooms = await get<Room[]>("/rooms", rtt);
    const inventory = await get<InventoryRow[]>("/inventory", rtt);
    const top = await get<{ _id: string; total: number }[]>("/inventory/top-consumed", rtt, { limit: 5 });
    const clients = await get<unknown[]>("/clients", rtt);
    const reservations = await get<Reservation[]>("/reservations", rtt);
    return combine(rooms, inventory, top, clients, reservations);
  });

/* ---------------- benchmark ---------------- */

export interface BenchStats {
  media: number;
  mediana: number;
  p95: number;
  min: number;
  max: number;
}

export interface BenchMode {
  stats: BenchStats;
  requests: number;
  bytes: number;
}

export interface BenchResult {
  n: number;
  rtt: number;
  facade: BenchMode;
  directo: BenchMode;
  serie: BenchMode;
}

function summarize(samples: number[]): BenchStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    media: samples.reduce((a, b) => a + b, 0) / samples.length,
    mediana: q(0.5),
    p95: q(0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

const WARMUP = 2;

// Mismo experimento que docs/presentacion/medir-tiempos.js, pero desde el navegador.
// Los tres modos se intercalan en cada vuelta para que ninguno se beneficie del calentamiento.
export async function runBenchmark(
  n: number,
  rtt: number,
  onProgress: (done: number, total: number) => void
): Promise<BenchResult> {
  const modes = { facade: getStatsFacade, directo: getStatsDirect, serie: getStatsDirectSerie };
  const keys = Object.keys(modes) as (keyof typeof modes)[];
  const samples: Record<string, number[]> = { facade: [], directo: [], serie: [] };
  const meta: Record<string, { requests: number; bytes: number }> = {};
  const total = n + WARMUP;

  for (let i = 0; i < total; i++) {
    for (const key of keys) {
      const r = await modes[key](rtt);
      if (i >= WARMUP) samples[key].push(r.ms);
      meta[key] = { requests: r.requests, bytes: r.bytes };
    }
    onProgress(i + 1, total);
  }

  const pack = (key: string): BenchMode => ({ stats: summarize(samples[key]), ...meta[key] });
  return { n, rtt, facade: pack("facade"), directo: pack("directo"), serie: pack("serie") };
}
