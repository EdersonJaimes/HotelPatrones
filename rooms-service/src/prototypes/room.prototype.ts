import { RoomStatus, RoomType } from "../models/room.model";

/**
 * Patrón Prototype (GoF) — único patrón de creación de este microservicio.
 *
 * Cada tipo de habitación (individual, doble, triple, suite) tiene un
 * objeto plantilla (prototipo) ya configurado: precio sugerido, rango de
 * precio permitido, capacidad, amenities y minutos de limpieza. Crear una
 * habitación nueva consiste en CLONAR ese prototipo (clone() devuelve una
 * copia independiente, nunca la instancia original) y ajustar solo lo que
 * cambia entre habitaciones del mismo tipo: número, y opcionalmente precio,
 * amenities o estado puntuales.
 */
export interface RoomPrototype {
  type: RoomType;
  price: number;
  minPrice: number;
  maxPrice: number;
  capacity: number;
  amenities: string[];
  cleaningMinutes: number;
  status: RoomStatus;
  clone(): RoomPrototype;
}

class BaseRoomPrototype implements RoomPrototype {
  constructor(
    public readonly type: RoomType,
    public readonly price: number,
    public readonly minPrice: number,
    public readonly maxPrice: number,
    public readonly capacity: number,
    public readonly amenities: string[],
    public readonly cleaningMinutes: number,
    public readonly status: RoomStatus = "available"
  ) {}

  // Clonación: instancia nueva e independiente. El arreglo de amenities
  // se copia aparte para que nadie pueda mutar por accidente la plantilla
  // original del registro al modificar la copia.
  clone(): RoomPrototype {
    return new BaseRoomPrototype(
      this.type,
      this.price,
      this.minPrice,
      this.maxPrice,
      this.capacity,
      [...this.amenities],
      this.cleaningMinutes,
      this.status
    );
  }
}

// Registro de prototipos: una plantilla base por cada tipo de habitación.
// minPrice/maxPrice reemplazan lo que antes validaba la Factory eliminada.
const registry: Record<RoomType, RoomPrototype> = {
  individual: new BaseRoomPrototype(
    "individual",
    25000,
    20000,
    35000,
    1,
    ["Wifi", "TV"],
    15
  ),
  doble: new BaseRoomPrototype(
    "doble",
    45000,
    35000,
    60000,
    2,
    ["Wifi", "TV", "Aire acondicionado"],
    20
  ),
  triple: new BaseRoomPrototype(
    "triple",
    70000,
    55000,
    90000,
    3,
    ["Wifi", "TV", "Aire acondicionado", "Minibar"],
    25
  ),
  suite: new BaseRoomPrototype(
    "suite",
    120000,
    90000,
    200000,
    4,
    ["Wifi", "TV", "Aire acondicionado", "Minibar", "Jacuzzi", "Balcón", "Caja fuerte"],
    40
  )
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

// Valida que un precio puntual esté dentro del rango permitido para el tipo,
// usando como referencia el propio prototipo clonado de ese tipo. Esto es lo
// que antes resolvía la Factory eliminada; aquí vive dentro del prototipo
// porque el rango es un atributo más de la plantilla de ese tipo.
export function validatePriceForType(type: RoomType, price: number): void {
  const prototype = getRoomPrototype(type);

  if (price < prototype.minPrice || price > prototype.maxPrice) {
    throw new Error(
      `El precio para este tipo de habitación debe estar entre ${prototype.minPrice} y ${prototype.maxPrice}`
    );
  }
}
