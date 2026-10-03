/**
 * SUBSISTEMA - Cliente HTTP hacia clients-service.
 * Sabe cómo pedir clientes y nada más. No sabe que existe un Dashboard.
 */
class ClientsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchClients(authorization) {
    const res = await fetch(`${this.baseUrl}/api/clients`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`clients-service respondió ${res.status}`);
    }

    return res.json();
  }
}

module.exports = { ClientsClient };
