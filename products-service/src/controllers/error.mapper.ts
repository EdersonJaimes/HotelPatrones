import { Response } from "express";

/**
 * Traduce los errores de negocio (lanzados por los services como Error con
 * mensaje) al código HTTP correspondiente. Los errores desconocidos NO se
 * exponen al cliente: se registran y se responde con un mensaje genérico.
 */
export function sendError(res: Response, error: unknown, fallbackMessage: string): void {
  const message = error instanceof Error ? error.message : "";

  let status = 500;

  if (message.includes("no encontrado")) {
    status = 404;
  } else if (message.includes("Ya existe")) {
    status = 409;
  } else if (message.includes("Stock insuficiente")) {
    status = 400;
  }

  if (status === 500) {
    console.error("[PRODUCTS] Error no controlado:", error);
    res.status(500).json({ message: fallbackMessage });
    return;
  }

  res.status(status).json({ message });
}
