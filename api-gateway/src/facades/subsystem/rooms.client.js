/**
 * SUBSISTEMA - Cliente HTTP hacia rooms-service.
 * Sabe cómo pedir habitaciones y nada más. No sabe que existe un Dashboard.
 */
class RoomsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchRooms(authorization) {
    const res = await fetch(`${this.baseUrl}/api/rooms`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`rooms-service respondió ${res.status}`);
    }

    return res.json();
  }
}

module.exports = { RoomsClient };
