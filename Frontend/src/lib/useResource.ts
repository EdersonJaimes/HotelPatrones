import { useEffect, useState } from "react";
import { errMsg } from "./format";
import { perfMark, perfSince } from "./perf";

export interface LoadStats {
  ms: number; // cuánto tardó la carga completa en el navegador
  bytes: number; // lo descargado
  requests: number; // peticiones HTTP que hizo
}

interface Done<T> {
  load: () => Promise<T>;
  tick: number;
  data: T | null;
  error: string;
  stats: LoadStats;
}

/**
 * Carga un recurso y mide cuánto costó (ms, KB y peticiones).
 *
 * `load` debe ser una función estable (de módulo o memorizada): si cambia de
 * identidad se vuelve a pedir, y así el Panel cambia entre Facade / sin Facade.
 *  - reload():  vuelve a mostrar el estado "cargando" (reintentar tras un error).
 *  - refresh(): recarga en silencio, dejando la tabla visible (después de guardar).
 */
export function useResource<T>(load: () => Promise<T>) {
  const [done, setDone] = useState<Done<T> | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const mark = perfMark();
    const t0 = performance.now();

    const finish = (data: T | null, error: string) => {
      if (!alive) return;
      const sum = perfSince(mark, t0);
      setDone({
        load,
        tick,
        data,
        error,
        stats: { ms: performance.now() - t0, bytes: sum.bytes, requests: sum.requests },
      });
    };

    load().then(
      (data) => finish(data, ""),
      (e) => finish(null, errMsg(e, "No se pudo cargar la información"))
    );

    return () => {
      alive = false;
    };
  }, [load, tick]);

  const fresh = done !== null && done.load === load;
  const status: "loading" | "ready" | "error" = !fresh ? "loading" : done.error ? "error" : "ready";

  return {
    status,
    data: done?.data ?? null,
    error: done?.error ?? "",
    stats: done?.stats ?? null,
    refreshing: done !== null && (done.tick !== tick || !fresh),
    reload: () => {
      setDone(null);
      setTick((t) => t + 1);
    },
    refresh: () => setTick((t) => t + 1),
    setData: (fn: (current: T) => T) =>
      setDone((d) => (d && d.data !== null ? { ...d, data: fn(d.data) } : d)),
  };
}
