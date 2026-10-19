import { getRoomTypeFlyweight, RoomTypeFlyweight } from "../flyweights/roomType.flyweight";
import { RoomStatus, RoomType } from "../models/room.model";

/**
 * Patrón Prototype (GoF) — único patrón de creación de este microservicio.
 *
 * Cada tipo de habitación (individual, doble, triple, suite) tiene un
 * objeto plantilla (prototipo) ya configurado. Crear una habitación nueva
 * consiste en CLONAR ese prototipo (clone() devuelve una copia
 * independiente, nunca la instancia original) y ajustar solo lo que cambia
 * entre habitaciones del mismo tipo: número, y opcionalmente precio,
 * amenities o estado puntuales.
 *
 * Convive con el Flyweight (flyweights/roomType.flyweight.ts): el prototipo
 * solo COPIA lo que cada habitación puede personalizar (precio sugerido,
 * amenities, estado inicial); lo que nunca cambia por habitación (capacidad,
 * minutos de aseo, rango de precio) no se copia, se COMPARTE por referencia
 * a través de `kind`.
 */
export interface RoomPrototype {
  readonly kind: RoomTypeFlyweight;
  type: RoomType;
  price: number;
  amenities: string[];
  status: RoomStatus;
  clone(): RoomPrototype;
}

class BaseRoomPrototype implements RoomPrototype {
  constructor(
    public readonly kind: RoomTypeFlyweight,
    public readonly price: number,
    public readonly amenities: string[],
    public readonly status: RoomStatus = "available"
  ) {}

  get type(): RoomType {
    return this.kind.type;
  }

  // Clonación: instancia nueva e independiente. El arreglo de amenities
  // se copia aparte para que nadie pueda mutar por accidente la plantilla
  // original; el flyweight `kind` NO se copia: el clon apunta al mismo.
  clone(): RoomPrototype {
    return new BaseRoomPrototype(this.kind, this.price, [...this.amenities], this.status);
  }

  // Forma que ve el frontend en GET /rooms/prototypes: igual que antes,
  // con los datos del flyweight aplanados junto a los de la plantilla.
  toJSON() {
    return {
      type: this.kind.type,
      price: this.price,
      minPrice: this.kind.minPrice,
      maxPrice: this.kind.maxPrice,
      capacity: this.kind.capacity,
      amenities: this.amenities,
      cleaningMinutes: this.kind.cleaningMinutes,
      status: this.status
    };
  }
}

// Registro de prototipos: una plantilla base por cada tipo de habitación.
const registry: Record<RoomType, RoomPrototype> = {
  individual: new BaseRoomPrototype(getRoomTypeFlyweight("individual"), 25000, ["Wifi", "TV"]),
  doble: new BaseRoomPrototype(getRoomTypeFlyweight("doble"), 45000, ["Wifi", "TV", "Aire acondicionado"]),
  triple: new BaseRoomPrototype(getRoomTypeFlyweight("triple"), 70000, [
    "Wifi",
    "TV",
    "Aire acondicionado",
    "Minibar"
  ]),
  suite: new BaseRoomPrototype(getRoomTypeFlyweight("suite"), 120000, [
    "Wifi",
    "TV",
    "Aire acondicionado",
    "Minibar",
    "Jacuzzi",
    "Balcón",
    "Caja fuerte"
  ])
};

export function getRoomPrototype(type: RoomType): RoomPrototype {
  const prototype = registry[type];

  if (!prototype) {
    throw new Error("Tipo de habitación no soportado");
  }

  // Nunca se devuelve la instancia original del registro, siempre un clon.
  return prototype.clone();
}

export function listRoomPrototypes(): RoomPrototype[] {
  return Object.values(registry).map((prototype) => prototype.clone());
}

// El rango de precio es estado intrínseco del tipo: la validación es una
// operación del flyweight compartido, sin clonar ninguna plantilla.
export function validatePriceForType(type: RoomType, price: number): void {
  getRoomTypeFlyweight(type).validatePrice(price);
}
