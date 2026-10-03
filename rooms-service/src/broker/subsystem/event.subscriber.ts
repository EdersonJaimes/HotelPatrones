import { ConnectionManager } from "./connection.manager";

export interface EventMessage<T = any> {
  event: string;
  timestamp: string;
  data: T;
}

export interface SubscribeOptions<T = any> {
  queue: string;
  routingKeys: string[];
  handler: (message: EventMessage<T>) => Promise<void>;
}

/**
 * SUBSISTEMA (3/3) - Suscripción.
 * Declara la cola, la enlaza a las routing keys, parsea el JSON de cada
 * mensaje y decide ack / nack según el handler haya tenido éxito o no.
 */
export class EventSubscriber {
  constructor(
    private readonly connection: ConnectionManager,
    private readonly serviceName: string
  ) {}

  async subscribe<T = any>({ queue, routingKeys, handler }: SubscribeOptions<T>): Promise<void> {
    const channel = this.connection.getChannel();

    await channel.assertQueue(queue, { durable: true });

    for (const routingKey of routingKeys) {
      await channel.bindQueue(queue, this.connection.exchange, routingKey);
    }

    await channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        const message = JSON.parse(msg.content.toString()) as EventMessage<T>;
        await handler(message);
        channel.ack(msg);
      } catch (error) {
        console.error(`[${this.serviceName}][Broker] Error procesando mensaje en "${queue}":`, error);
        channel.nack(msg, false, false);
      }
    });

    console.log(`[${this.serviceName}][Broker] Escuchando ${routingKeys.join(", ")} en "${queue}"`);
  }
}
