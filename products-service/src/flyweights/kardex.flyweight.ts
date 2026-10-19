import { MovementType } from "../models/inventoryMovement.model";

/**
 * Patrón Flyweight (GoF, estructural) aplicado al kardex.
 *
 * El kardex tiene miles de movimientos, pero casi todos repiten lo mismo: el
 * producto (unos cientos distintos) y el tipo de movimiento (solo IN y OUT).
 *
 *   · Estado INTRÍNSECO (se repite, inmutable): el producto y el tipo. Vive en
 *     los flyweights, que la fábrica crea UNA vez y comparte por referencia.
 *   · Estado EXTRÍNSECO (propio de cada fila): id, cantidad, motivo y fecha.
 *     Vive en el contexto (KardexEntry), que apunta a sus flyweights.
 *
 * Igual que en Refactoring.Guru (Particle / MovingParticle): el contexto no
 * arma la fila por su cuenta, se la pide al flyweight pasándole su estado
 * extrínseco, como `particle.draw(coords, canvas)`.
 */

// ---------- Flyweights (estado intrínseco, compartido e inmutable) ----------

export class MovementTypeFlyweight {
  constructor(
    public readonly code: MovementType,
    public readonly label: string
  ) {
    Object.freeze(this);
  }
}

export interface MovementExtrinsicState {
  id: string;
  quantity: number;
  reason?: string;
  date: Date;
}

export class ProductFlyweight {
  // Referencia { _id, name } que entregan TODAS las filas de este producto:
  // un solo objeto en memoria, no una copia por movimiento.
  private readonly ref: { readonly _id: string; readonly name: string };

  constructor(
    public readonly productId: string,
    public readonly name: string
  ) {
    this.ref = Object.freeze({ _id: productId, name });
    Object.freeze(this);
  }

  // Operación del flyweight: recibe el estado extrínseco desde afuera y arma
  // la fila con la forma que espera el frontend (InventoryMovement).
  toRow(state: MovementExtrinsicState, type: MovementTypeFlyweight) {
    return {
      _id: state.id,
      product: this.ref,
      type: type.code,
      quantity: state.quantity,
      reason: state.reason,
      date: state.date
    };
  }
}

// ---------- Fábrica ----------

// Entrega siempre el mismo objeto para la misma clave; solo crea si no existe.
export class FlyweightFactory<T> {
  private readonly pool = new Map<string, T>();

  get(key: string, create: () => T): T {
    let flyweight = this.pool.get(key);

    if (!flyweight) {
      flyweight = create();
      this.pool.set(key, flyweight);
    }

    return flyweight;
  }

  get size(): number {
    return this.pool.size;
  }
}

const TYPE_LABELS: Record<MovementType, string> = { IN: "Entrada", OUT: "Salida" };

// Las fábricas viven mientras vive el servicio: los flyweights se reutilizan
// entre peticiones. La clave del producto incluye el nombre porque el kardex
// guarda el nombre que tenía al momento del movimiento; si el producto se
// renombró, los movimientos viejos conservan su nombre histórico.
const products = new FlyweightFactory<ProductFlyweight>();
const types = new FlyweightFactory<MovementTypeFlyweight>();

export function getProductFlyweight(productId: string, name: string): ProductFlyweight {
  return products.get(`${productId}|${name}`, () => new ProductFlyweight(productId, name));
}

export function getMovementTypeFlyweight(code: MovementType): MovementTypeFlyweight {
  return types.get(code, () => new MovementTypeFlyweight(code, TYPE_LABELS[code]));
}

// ---------- Contexto (estado extrínseco, uno por movimiento) ----------

export class KardexEntry {
  constructor(
    private readonly product: ProductFlyweight,
    private readonly type: MovementTypeFlyweight,
    private readonly state: MovementExtrinsicState
  ) {}

  // Delegación al flyweight, como MovingParticle.draw(canvas) → particle.draw(coords, canvas).
  toRow() {
    return this.product.toRow(this.state, this.type);
  }
}
