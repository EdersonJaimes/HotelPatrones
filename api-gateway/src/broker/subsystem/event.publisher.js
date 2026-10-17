/**
 * SUBSISTEMA (2/3) - Publicación.
 * Arma el sobre del mensaje (event + timestamp + data), lo serializa a Buffer
 * y lo publica en el exchange con las opciones de persistencia.
 */
class EventPublisher {
  constructor(connection, serviceName) {
    this.connection = connection;
    this.serviceName = serviceName;
  }

  publish(routingKey, eventName, data) {
    const channel = this.connection.getChannel();

    const message = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data
    };

    channel.publish(this.connection.exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: "application/json"
    });
  }
}

module.exports = { EventPublisher };
