
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

    // Lista con nombre y stock (de menor a mayor) para que el frontend pueda
    // mostrar QUÉ productos están bajos, no solo cuántos.
    const lowStockProducts =
      inventoryResult.status === "fulfilled"
        ? inventoryResult.value
            .filter((row) => row.stock <= this.lowStockThreshold)
            .map((row) => ({ _id: row._id, name: row.product?.name, stock: row.stock }))
            .sort((a, b) => a.stock - b.stock)
        : (warnings.push(`products-service (inventory): ${inventoryResult.reason.message}`), null);

    const lowStock = lowStockProducts ? lowStockProducts.length : null;

    const topProducts =
      topConsumedResult.status === "fulfilled"
        ? topConsumedResult.value
        : (warnings.push(`products-service (top-consumed): ${topConsumedResult.reason.message}`), []);

    const clients =
      clientsResult.status === "fulfilled"
        ? clientsResult.value.length
        : (warnings.push(`clients-service: ${clientsResult.reason.message}`), null);

    return {
      clients,
      roomsOccupied,
      lowStock,
      lowStockProducts: lowStockProducts ?? [],
      lowStockThreshold: this.lowStockThreshold,
      topProducts,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  }
}

module.exports = { DashboardFacade };
