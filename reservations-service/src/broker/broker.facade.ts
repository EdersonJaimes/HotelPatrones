import { ConnectionManager } from "./subsystem/connection.manager";
import { EventPublisher } from "./subsystem/event.publisher";
import { EventSubscriber, SubscribeOptions } from "./subsystem/event.subscriber";

/**
 * PATRÓN FACADE (estructural).
 *
 * Problema: hablar con RabbitMQ exige coordinar varias piezas (conexión,
 * canal, exchange, serialización a Buffer, colas, bindings, ack/nack) y
 * hacerlo en el orden correcto. Antes, cada publisher y consumer del
 * microservicio repetía ese trabajo hablando directo con amqplib.
 *
 * Solución: esta fachada ofrece una interfaz mínima (connect / publish /
 * subscribe) y delega en el subsistema. El resto del microservicio ya no
 * importa amqplib: solo conoce esta clase.
 *
 * Igual que en la teoría, el constructor permite inyectar subsistemas ya
 * creados (útil para pruebas) o dejar que la fachada los cree por sí misma.
 */
export class BrokerFacade {
  private readonly connection: ConnectionManager;
  private readonly publisher: EventPublisher;
  private readonly subscriber: EventSubscriber;

  constructor(
    serviceName: string,
    subsystems?: {
      connection?: ConnectionManager;
      publisher?: EventPublisher;
      subscriber?: EventSubscriber;
    }
  ) {
    this.connection = subsystems?.connection ?? new ConnectionManager(serviceName);
    this.publisher = subsystems?.publisher ?? new EventPublisher(this.connection, serviceName);
    this.subscriber = subsystems?.subscriber ?? new EventSubscriber(this.connection, serviceName);
  }

  connect(): Promise<void> {
    return this.connection.connect();
  }

  publish(routingKey: string, eventName: string, data: unknown): void {
    this.publisher.publish(routingKey, eventName, data);
  }

  subscribe<T = any>(options: SubscribeOptions<T>): Promise<void> {
    return this.subscriber.subscribe<T>(options);
  }
}

// Instancia única por microservicio: es lo que importan publishers, consumers y server.ts.
export const broker = new BrokerFacade("RESERVATIONS");
