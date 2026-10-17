// Formas que devuelven los microservicios a través del api-gateway.

export type RoomType = "individual" | "doble" | "triple" | "suite";
export type RoomStatus = "available" | "occupied" | "cleaning" | "maintenance";

export interface Room {
  _id: string;
  number: number;
  type: RoomType;
  price: number;
  status: RoomStatus;
  capacity: number;
  amenities: string[];
  cleaningMinutes: number;
}

export interface RoomPrototype {
  type: RoomType;
  price: number;
  minPrice: number;
  maxPrice: number;
  capacity: number;
  amenities: string[];
  cleaningMinutes: number;
  status: RoomStatus;
}

export type ReservationChannel = "walk_in" | "phone" | "online" | "corporate";
export type ReservationStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";

export interface Reservation {
  _id: string;
  roomId: string;
  roomNumber: number;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  channel: ReservationChannel;
  status: ReservationStatus;
  basePrice: number;
  totalPrice: number;
  cancellationDeadline: string;
  cancellationPenalty?: number;
  notes?: string;
}

export interface Client {
  _id: string;
  name: string;
  document: string;
  phone: string;
  createdAt?: string;
}

export type ProductCategory = "Bebida" | "Snack" | "Aseo" | "General";

export interface Product {
  _id: string;
  name: string;
  price: number;
  category: ProductCategory;
  stock: number;
}

export interface InventoryRow {
  _id: string;
  product: { _id: string; name: string };
  stock: number;
}

export interface InventoryMovement {
  _id: string;
  product: { _id: string; name: string };
  type: "IN" | "OUT";
  quantity: number;
  reason?: string;
  date: string;
}

export interface StayLine {
  product: { _id: string; name: string };
  quantity: number;
  unitPrice: number;
}

export interface Stay {
  _id: string;
  roomId: string;
  roomNumber: number;
  hourlyRate: number;
  status: "active" | "closed";
  startedAt: string;
  endedAt?: string;
  products: StayLine[];
  hours?: number;
  roomTotal?: number;
  productsTotal?: number;
  total?: number;
}

export interface Checkout {
  stayId: string;
  roomNumber: number;
  hours: number;
  roomTotal: number;
  productsTotal: number;
  total: number;
}

export interface User {
  _id: string;
  name: string;
  username: string;
  role: "admin" | "recepcionista";
  active?: boolean;
}

export const LOW_STOCK = 5;
