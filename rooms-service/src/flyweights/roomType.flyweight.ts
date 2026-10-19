import { RoomStatus, RoomType } from "../models/room.model";

/**
 * Patrón Flyweight (GoF, estructural) aplicado a los tipos de habitación.
 *
 * Hay muchas habitaciones (120 en el seed) pero solo 4 tipos.
 *
 *   · Estado INTRÍNSECO (se repite, inmutable): capacidad, minutos de aseo y
 *     rango de precio. Depende solo del tipo y vive en el flyweight, que la
 *     fábrica crea UNA vez por tipo y comparte por referencia.
 *   · Estado EXTRÍNSECO (propio de cada habitación): id, número, estado,
 *     precio puntual y amenities. Es lo único que se guarda en Mongo y vive
 *     en el contexto (RoomEntry), que apunta a su flyweight.
 *
 * Igual que en Refactoring.Guru (Particle / MovingParticle): el contexto no
 * arma la respuesta por su cuenta, se la pide al flyweight pasándole su
 * estado extrínseco, como `particle.draw(coords, canvas)`.
 */

// ---------- Flyweight (estado intrínseco, compartido e inmutable) ----------

export interface RoomExtrinsicState {
  _id: { toString(): string };
  number: number;
  type: RoomType;
  status: RoomStatus;
  price: number;
  amenities: string[];
}

export class RoomTypeFlyweight {
  constructor(
    public readonly type: RoomType,
    public readonly capacity: number,
    public readonly cleaningMinutes: number,
    public readonly minPrice: number,
    public readonly maxPrice: number
  ) {
    Object.freeze(this);
  }

  // Operaciones del flyweight: reciben el estado extrínseco desde afuera.

  // Habitación completa, con la forma que espera el frontend (Room).
  toView<S extends RoomExtrinsicState>(state: S) {
    return { ...state, capacity: this.capacity, cleaningMinutes: this.cleaningMinutes };
  }

  // Datos de los eventos room.* que consume reservations-service.
  toEvent(state: RoomExtrinsicState) {
    return {
      roomId: state._id.toString(),
      number: state.number,
      type: this.type,
      price: state.price,
      status: state.status,
      capacity: this.capacity
    };
  }

  validatePrice(price: number): void {
    if (price < this.minPrice || price > this.maxPrice) {
      throw new Error(
        `El precio para este tipo de habitación debe estar entre ${this.minPrice} y ${this.maxPrice}`
      );
    }
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

const INTRINSIC: Record<RoomType, [capacity: number, cleaningMinutes: number, minPrice: number, maxPrice: number]> = {
  individual: [1, 15, 20000, 35000],
  doble: [2, 20, 35000, 60000],
  triple: [3, 25, 55000, 90000],
  suite: [4, 40, 90000, 200000]
};

// La fábrica vive mientras vive el servicio: los 4 flyweights se reutilizan
// entre peticiones.
const roomTypes = new FlyweightFactory<RoomTypeFlyweight>();

export function getRoomTypeFlyweight(type: RoomType): RoomTypeFlyweight {
  const intrinsic = INTRINSIC[type];

  if (!intrinsic) {
    throw new Error("Tipo de habitación no soportado");
  }

  return roomTypes.get(type, () => new RoomTypeFlyweight(type, ...intrinsic));
}

// ---------- Contexto (estado extrínseco, uno por habitación) ----------

export class RoomEntry<S extends RoomExtrinsicState> {
  private readonly kind: RoomTypeFlyweight;

  constructor(private readonly state: S) {
    this.kind = getRoomTypeFlyweight(state.type);
  }

  // Delegación al flyweight, como MovingParticle.draw(canvas) → particle.draw(coords, canvas).
  toView() {
    return this.kind.toView(this.state);
  }

  toEvent() {
    return this.kind.toEvent(this.state);
  }
}
