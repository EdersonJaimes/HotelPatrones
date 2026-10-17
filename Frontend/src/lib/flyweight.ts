// PATRÓN FLYWEIGHT (estructural).
//
// Problema: el kardex tiene miles de movimientos y casi todos repiten lo mismo: el nombre del producto
// (1 200 productos para 6 000 movimientos) y la descripción del tipo (solo existen IN y OUT).
// Si cada fila guarda su propia copia, se duplican cadenas y objetos que nunca cambian.
//
// Solución: se separa el estado en dos partes.
//   · Intrínseco (igual para muchos, inmutable): el producto y el tipo de movimiento. Se crea UNA vez
//     por la fábrica y se comparte por referencia.
//   · Extrínseco (propio de cada fila): cantidad, motivo y fecha. Es lo único que cada fila guarda.

export interface RawMovement {
  _id: string;
  product: { _id: string; name: string };
  type: "IN" | "OUT";
  quantity: number;
  reason: string;
  date: string;
}

// ---------- Flyweights (estado intrínseco, compartido) ----------
export interface ProductFly {
  readonly id: string;
  readonly name: string;
  readonly key: string; // nombre en minúsculas, ya listo para buscar
}

export interface TypeFly {
  readonly code: "IN" | "OUT";
  readonly label: string;
  readonly sign: string;
  readonly tone: string;
}

const TYPE_INFO: Record<"IN" | "OUT", Omit<TypeFly, "code">> = {
  IN: { label: "Entrada", sign: "+", tone: "ok" },
  OUT: { label: "Salida", sign: "−", tone: "warn" },
};

// Fábrica: entrega siempre el mismo objeto para la misma clave.
export class FlyweightFactory<T> {
  private readonly pool = new Map<string, T>();
  private readonly uses = new Map<T, number>();

  get(key: string, create: () => T): T {
    let fly = this.pool.get(key);
    if (!fly) {
      fly = create();
      this.pool.set(key, fly);
    }
    this.uses.set(fly, (this.uses.get(fly) ?? 0) + 1);
    return fly;
  }

  get size() {
    return this.pool.size;
  }

  values(): IterableIterator<T> {
    return this.pool.values();
  }

  usesOf(fly: T) {
    return this.uses.get(fly) ?? 0;
  }
}

// ---------- Filas ----------
// Sin Flyweight: cada fila lleva TODO, incluidas sus copias del nombre y de la descripción del tipo.
export interface PlainRow {
  id: string;
  productId: string;
  productName: string;
  productKey: string;
  typeCode: string;
  typeLabel: string;
  typeSign: string;
  typeTone: string;
  quantity: number;
  reason: string;
  date: number;
}

// Con Flyweight: la fila solo guarda lo suyo y apunta a los objetos compartidos.
export interface FlyRow {
  id: string;
  product: ProductFly;
  type: TypeFly;
  quantity: number;
  reason: string;
  date: number;
}

// Copia real de una cadena (evita que el motor reutilice la misma en memoria y esconda el costo del caso "sin").
const own = (s: string) => (s.length ? (s + "\u0000").slice(0, -1) : s);

export function buildPlain(raw: RawMovement[]): PlainRow[] {
  return raw.map((m) => {
    const info = TYPE_INFO[m.type];
    const name = own(m.product.name);
    return {
      id: m._id,
      productId: own(m.product._id),
      productName: name,
      productKey: name.toLowerCase(),
      typeCode: own(m.type),
      typeLabel: own(info.label),
      typeSign: own(info.sign),
      typeTone: own(info.tone),
      quantity: m.quantity,
      reason: m.reason,
      date: new Date(m.date).getTime(),
    };
  });
}

export interface FlyStore {
  rows: FlyRow[];
  products: FlyweightFactory<ProductFly>;
  types: FlyweightFactory<TypeFly>;
}

export function buildFly(raw: RawMovement[]): FlyStore {
  const products = new FlyweightFactory<ProductFly>();
  const types = new FlyweightFactory<TypeFly>();

  const rows = raw.map((m) => ({
    id: m._id,
    product: products.get(m.product._id, () => ({ id: m.product._id, name: m.product.name, key: m.product.name.toLowerCase() })),
    type: types.get(m.type, () => ({ code: m.type, ...TYPE_INFO[m.type] })),
    quantity: m.quantity,
    reason: m.reason,
    date: new Date(m.date).getTime(),
  }));

  return { rows, products, types };
}

// ---------- Búsqueda ----------
// Sin Flyweight: hay que mirar el texto de CADA fila.
export function searchPlain(rows: PlainRow[], q: string): PlainRow[] {
  return rows.filter((r) => r.productKey.includes(q));
}

// Con Flyweight: se busca en los productos únicos y las filas solo comparan una referencia.
export function searchFly(store: FlyStore, q: string): FlyRow[] {
  const hits = new Set<ProductFly>();
  for (const p of store.products.values()) if (p.key.includes(q)) hits.add(p);
  return store.rows.filter((r) => hits.has(r.product));
}

// ---------- Memoria estimada ----------
// Estimación simple y explicable (no es el heap real del navegador): una cadena pesa ~2 bytes por
// carácter + 16 de cabecera; cada objeto 16 + 8 por campo; cada referencia 8.
const str = (s: string) => 16 + s.length * 2;
const obj = (fields: number) => 16 + fields * 8;

export function estimatePlain(rows: PlainRow[]): number {
  let bytes = 0;
  for (const r of rows) {
    bytes += obj(11) + str(r.id) + str(r.productId) + str(r.productName) + str(r.productKey);
    bytes += str(r.typeCode) + str(r.typeLabel) + str(r.typeSign) + str(r.typeTone) + str(r.reason);
  }
  return bytes;
}

export function estimateFly(store: FlyStore): number {
  let bytes = 0;
  for (const r of store.rows) bytes += obj(6) + str(r.id) + str(r.reason);
  for (const p of store.products.values()) bytes += obj(3) + str(p.id) + str(p.name) + str(p.key);
  for (const t of store.types.values()) bytes += obj(4) + str(t.code) + str(t.label) + str(t.sign) + str(t.tone);
  return bytes;
}
