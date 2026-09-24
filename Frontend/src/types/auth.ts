export type Role = "admin" | "recepcionista";

export interface User {
  token: string | null;
  role: Role | null;
}