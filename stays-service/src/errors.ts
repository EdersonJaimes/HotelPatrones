import { Response } from "express";

/** Error de negocio con el código HTTP que debe recibir el cliente. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

// Los errores desconocidos NO se exponen al cliente: se registran y se
// responde un mensaje genérico.
export function sendError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  console.error("[STAYS] Error no controlado:", error);
  res.status(500).json({ message: fallbackMessage });
}
