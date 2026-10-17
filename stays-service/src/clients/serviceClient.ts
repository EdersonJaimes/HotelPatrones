import { AppError } from "../errors";

/**
 * Cliente HTTP mínimo para hablar con otros microservicios reenviando el token
 * del usuario que originó la petición (los destinos vuelven a validar el JWT
 * y aplicar sus propios roles, así Stays no se salta ninguna regla).
 */
export class ServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly label: string
  ) {}

  async request<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new AppError(502, `${this.label} no está disponible en este momento`);
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = (payload as { message?: string }).message ?? `Error en ${this.label}`;
      // 400/404/409 de un servicio vecino son errores de negocio que el usuario debe ver;
      // cualquier otro fallo se reporta como 502 para no confundirlo con un error propio.
      const status = [400, 404, 409].includes(response.status) ? response.status : 502;
      throw new AppError(status, message);
    }

    return payload as T;
  }
}
