/**
 * SUBSISTEMA - Cliente HTTP hacia products-service.
 * Sabe cómo pedir inventario y el top de consumo. No sabe que existe un Dashboard.
 */
class ProductsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchInventory(authorization) {
    const res = await fetch(`${this.baseUrl}/api/inventory`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`products-service (inventory) respondió ${res.status}`);
    }

    return res.json();
  }

  async fetchTopConsumed(authorization, limit) {
    const res = await fetch(`${this.baseUrl}/api/inventory/top-consumed?limit=${limit}`, {
      headers: { authorization }
    });

    if (!res.ok) {
      throw new Error(`products-service (top-consumed) respondió ${res.status}`);
    }

    return res.json();
  }
}

module.exports = { ProductsClient };
