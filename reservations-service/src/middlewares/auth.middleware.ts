import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: "admin" | "recepcionista";
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.substring(7) : null;

  if (!token) {
    res.status(401).json({ message: "Token requerido" });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "JWT_SECRET no está configurada" });
    return;
  }

  try {
    req.user = jwt.verify(token, secret) as AuthenticatedRequest["user"];
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}

export function requireRole(...roles: Array<"admin" | "recepcionista">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "No tiene permisos para esta operación" });
      return;
    }

    next();
  };
}
