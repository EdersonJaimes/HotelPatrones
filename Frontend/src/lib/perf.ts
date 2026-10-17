import { useSyncExternalStore } from "react";

// Registro de cada petición HTTP del navegador: cuánto tardó (ms) y cuánto pesó.
// Alimenta el medidor de la barra superior, los chips "cargado en X ms" de cada
// pantalla y el laboratorio Facade / sin Facade del Panel.
export interface PerfEntry {
  id: number;
  method: string;
  url: string;
  status: number;
  ok: boolean;
  start: number; // performance.now() al salir la petición
  ms: number;
  bytes: number;
}

const MAX_ENTRIES = 80;

let counter = 0;
let entries: PerfEntry[] = [];
const listeners = new Set<() => void>();

export function recordRequest(entry: Omit<PerfEntry, "id">): void {
  counter += 1;
  entries = [{ ...entry, id: counter }, ...entries].slice(0, MAX_ENTRIES);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const usePerfEntries = () => useSyncExternalStore(subscribe, () => entries);

// Marca "desde aquí": sirve para medir cuántas peticiones y cuántos ms costó una carga.
export const perfMark = () => counter;

export interface PerfSummary {
  requests: number;
  bytes: number;
  entries: PerfEntry[]; // de la más antigua a la más reciente
}

export function perfSince(mark: number, startedAfter = 0): PerfSummary {
  const list = entries.filter((e) => e.id > mark && e.start >= startedAfter).reverse();
  return { requests: list.length, bytes: list.reduce((s, e) => s + e.bytes, 0), entries: list };
}

// Clasificación visual de la velocidad de una carga.
export const speedTone = (ms: number) => (ms < 300 ? "ok" : ms < 1000 ? "slow" : "bad");
