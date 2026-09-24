export interface Room {
  _id?: string;
  number: number;
  type: "individual" | "doble" | "triple" | "suite";
  price: number;
  status: "available" | "occupied" | "cleaning" | "maintenance";
  capacity?: number;
  amenities?: string[];
}
