import mongoose from "mongoose";
import v8 from "v8";
import vm from "vm";

/**
 * Medidor de RAM del propio proceso, para comparar con datos reales el antes y
 * el después del Flyweight (lo consume la vista Patrones del frontend).
 *
 * Mide el heap de V8 que queda RETENIDO por lo que arma una función: se fuerza
 * el recolector de basura antes y después, y la diferencia es lo que ocupa.
 */

// Habilita global.gc() sin tener que arrancar Node con --expose-gc.
v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc") as () => void;

function heapUsed(): number {
  gc();
  gc();
  return process.memoryUsage().heapUsed;
}

// Síncrono a propósito: si `build` fuera async, la promesa anterior seguiría
// sujetando su resultado y la medición "antes" ya lo incluiría.
export function retainedBytes(build: () => unknown, runs = 3): number {
  const samples: number[] = [];
  let keep: unknown;

  for (let i = 0; i < runs; i++) {
    keep = null;
    const before = heapUsed();
    keep = build();
    samples.push(heapUsed() - before);
  }

  void keep;
  samples.sort((a, b) => a - b);
  return Math.max(0, samples[Math.floor(runs / 2)]);
}

// Cada búfer es un documento tal como llega de Mongo; deserializarlo es lo
// mismo que hace el driver dentro de find().
export function deserialize<T>(buffer: Buffer): T {
  return mongoose.mongo.BSON.deserialize(buffer) as T;
}
