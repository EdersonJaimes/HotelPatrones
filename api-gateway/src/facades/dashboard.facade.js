/**
 * PATRÓN FACADE (estructural) - aplicado como "BFF" (Backend For Frontend).
 *
 * Problema: Dashboard.tsx necesita UN solo objeto con estadísticas que en
 * realidad viven repartidas en 2 microservicios distintos (rooms-service y
 * products-service). Sin esta fachada, el frontend tendría que conocer la
 * existencia de ambos, llamarlos por separado y combinar los resultados él
 * mismo en el navegador.
 *
 * Solución: esta fachada expone un único método, getStats(token), que hace
 * el fan-out a los 3 subsistemas y entrega ya combinado lo que el frontend
 * necesita, con la MISMA forma que espera Dashboard.tsx:
 *   { clients, roomsOccupied, lowStock, topProducts }
 *
 * clients-service se agregó después de rooms-service y products-service: la
 * fachada solo necesitó un subsistema nuevo (ClientsClient) y una rama más
 * en Promise.allSettled. Ni getStats() cambió de firma ni Dashboard.tsx tuvo
 * que tocarse: esa es la ventaja de que el frontend dependa de la fachada y
 * no de los microservicios uno por uno.
 *
 * Resiliencia: usa Promise.allSettled en vez de Promise.all. Si uno de los
 * 2 microservicios está caído, el dashboard igual responde 200 con lo que sí
 * pudo obtener (en vez de que todo el dashboard falle por culpa de una sola
 * pieza). Los fallos quedan registrados en "warnings" (el frontend actual
 * ignora esa clave sin problema, pero ya queda lista para mostrarla).
 */
class DashboardFacade {
  constructor(roomsClient, productsClient, clientsClient, options = {}) {
    this.roomsClient = roomsClient;
    this.productsClient = productsClient;
    this.clientsClient = clientsClient;
    this.lowStockThreshold = options.lowStockThreshold ?? 5;
    this.topProductsLimit = options.topProductsLimit ?? 5;
  }

  async getStats(authorization) {
    const [roomsResult, inventoryResult, topConsumedResult, clientsResult] = await Promise.allSettled([
      this.roomsClient.fetchRooms(authorization),
      this.productsClient.fetchInventory(authorization),
      this.productsClient.fetchTopConsumed(authorization, this.topProductsLimit),
      this.clientsClient.fetchClients(authorization)
    ]);

    const warnings = [];

    const roomsOccupied =
      roomsResult.status === "fulfilled"
        ? roomsResult.value.filter((room) => room.status === "occupied").length
        : (warnings.push(`rooms-service: ${roomsResult.reason.message}`), null);

    const lowStock =
      inventoryResult.status === "fulfilled"
        ? inventoryResult.value.filter((row) => row.stock <= this.lowStockThreshold).length
        : (warnings.push(`products-service (inventory): ${inventoryResult.reason.message}`), null);

    // El top solo trae ids: los nombres salen del inventario (si el producto
    // fue eliminado o el inventario falló, se deja el id como nombre).
    const names = new Map(
      inventoryResult.status === "fulfilled"
        ? inventoryResult.value.map((row) => [String(row.product._id), row.product.name])
        : []
    );

    const topProducts =
      topConsumedResult.status === "fulfilled"
        ? topConsumedResult.value.map((item) => ({
            ...item,
            name: names.get(String(item._id)) ?? String(item._id)
          }))
        : (warnings.push(`products-service (top-consumed): ${topConsumedResult.reason.message}`), []);

    const clients =
      clientsResult.status === "fulfilled"
        ? clientsResult.value.length
        : (warnings.push(`clients-service: ${clientsResult.reason.message}`), null);

    return {
      clients,
      roomsOccupied,
      lowStock,
      topProducts,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  }
}

module.exports = { DashboardFacade };
