/**
 * SUBSISTEMA (3/3) - Suscripción.
 * Declara la cola, la enlaza a las routing keys, parsea el JSON de cada
 * mensaje y decide ack / nack según el handler haya tenido éxito o no.
 */
class EventSubscriber {
  constructor(connection, serviceName) {
    this.connection = connection;
    this.serviceName = serviceName;
  }

  async subscribe({ queue, routingKeys, handler }) {
    const channel = this.connection.getChannel();

    await channel.assertQueue(queue, { durable: true });

    for (const routingKey of routingKeys) {
      await channel.bindQueue(queue, this.connection.exchange, routingKey);
    }

    await channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        await handler(message, msg.fields.routingKey);
        channel.ack(msg);
      } catch (error) {
        console.error(`[${this.serviceName}][Broker] Error procesando mensaje en "${queue}":`, error.message);
        channel.nack(msg, false, false);
      }
    });

    console.log(`[${this.serviceName}][Broker] Escuchando ${routingKeys.join(", ")} en "${queue}"`);
  }
}

module.exports = { EventSubscriber };
