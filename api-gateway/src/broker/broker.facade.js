const { ConnectionManager } = require("./subsystem/connection.manager");
const { EventPublisher } = require("./subsystem/event.publisher");
const { EventSubscriber } = require("./subsystem/event.subscriber");

/**
 * PATRÓN FACADE (estructural) - Broker.
 *
 * Es la misma fachada que tienen los microservicios en src/broker/broker.facade.ts:
 * hablar con RabbitMQ exige coordinar varias piezas (conexión, canal, exchange, serialización
 * a Buffer, colas, bindings, ack/nack) en el orden correcto. La fachada ofrece una interfaz
 * mínima (connect / publish / subscribe) y delega en el subsistema.
 */
class BrokerFacade {
  constructor(serviceName, subsystems = {}) {
    this.connection = subsystems.connection || new ConnectionManager(serviceName);
    this.publisher = subsystems.publisher || new EventPublisher(this.connection, serviceName);
    this.subscriber = subsystems.subscriber || new EventSubscriber(this.connection, serviceName);
  }

  connect() {
    return this.connection.connect();
  }

  get connected() {
    return this.connection.connected;
  }

  publish(routingKey, eventName, data) {
    this.publisher.publish(routingKey, eventName, data);
  }

  subscribe(options) {
    return this.subscriber.subscribe(options);
  }
}

module.exports = { BrokerFacade, broker: new BrokerFacade("GATEWAY") };
