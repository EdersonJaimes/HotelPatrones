/**
 * SUBSISTEMA - Cliente HTTP hacia reservations-service.
 * Sabe cómo pedir reservas y nada más. No sabe que existe un Dashboard.
 */
class ReservationsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchSummary(authorization) {
    const res = await fetch(`${this.baseUrl}/api/reservations/summary?arrivals=5`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`reservations-service respondió ${res.status}`);
    }

    return res.json();
  }

  async fetchReservations(authorization) {
    const res = await fetch(`${this.baseUrl}/api/reservations`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`reservations-service respondió ${res.status}`);
    }

    return res.json();
  }
}

module.exports = { ReservationsClient };
