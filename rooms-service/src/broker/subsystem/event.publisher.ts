import { ConnectionManager } from "./connection.manager";

/**
 * SUBSISTEMA (2/3) - Publicación.
 * Arma el sobre del mensaje (event + timestamp + data), lo serializa a Buffer
 * y lo publica en el exchange con las opciones de persistencia.
 */
export class EventPublisher {
  constructor(
    private readonly connection: ConnectionManager,
    private readonly serviceName: string
  ) {}

  publish(routingKey: string, eventName: string, data: unknown): void {
    const channel = this.connection.getChannel();

    const message = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data
    };

    channel.publish(
      this.connection.exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
        contentType: "application/json"
      }
    );

    console.log(`[${this.serviceName}][Broker] Evento publicado: ${routingKey}`);
  }
}
