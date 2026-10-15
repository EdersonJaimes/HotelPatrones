
class DashboardFacade {
  constructor(roomsClient, productsClient, clientsClient, reservationsClient, options = {}) {
    this.roomsClient = roomsClient;
    this.productsClient = productsClient;
    this.clientsClient = clientsClient;
    this.reservationsClient = reservationsClient;
    this.lowStockThreshold = options.lowStockThreshold ?? 5;
    this.topProductsLimit = options.topProductsLimit ?? 5;
    this.lowStockListLimit = options.lowStockListLimit ?? 8;
    this.arrivalsLimit = options.arrivalsLimit ?? 5;
  }

  async getStats(authorization) {
    const [roomsResult, inventoryResult, topConsumedResult, clientsResult, reservationsResult] =
      await Promise.allSettled([
        this.roomsClient.fetchRooms(authorization),
        this.productsClient.fetchInventory(authorization),
        this.productsClient.fetchTopConsumed(authorization, this.topProductsLimit),
        this.clientsClient.fetchClients(authorization),
        this.reservationsClient.fetchReservations(authorization)
      ]);

    const warnings = [];

    const roomsOccupied =
      roomsResult.status === "fulfilled"
        ? roomsResult.value.filter((room) => room.status === "occupied").length
        : (warnings.push(`rooms-service: ${roomsResult.reason.message}`), null);

    // Versión "liviana" de las habitaciones: el panel solo necesita número y estado
    // para pintar la fachada y los contadores, no el objeto completo de cada una.
    const rooms =
      roomsResult.status === "fulfilled"
        ? roomsResult.value.map((room) => ({ _id: room._id, number: room.number, status: room.status }))
        : [];

    const lowRows =
      inventoryResult.status === "fulfilled"
        ? inventoryResult.value.filter((row) => row.stock <= this.lowStockThreshold)
        : null;

    if (lowRows === null) {
      warnings.push(`products-service (inventory): ${inventoryResult.reason.message}`);
    }

    const lowStock = lowRows === null ? null : lowRows.length;

    const lowStockItems =
      lowRows === null
        ? []
        : lowRows
            .slice()
            .sort((a, b) => a.stock - b.stock)
            .slice(0, this.lowStockListLimit)
            .map((row) => ({ _id: String(row.product._id), name: row.product.name, stock: row.stock }));

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

    let reservations = null;

    if (reservationsResult.status === "fulfilled") {
      const now = Date.now();
      const all = reservationsResult.value;

      reservations = {
        active: all.filter((r) => ["pending", "confirmed", "checked_in"].includes(r.status)).length,
        arrivals: all
          .filter((r) => ["pending", "confirmed"].includes(r.status) && new Date(r.checkIn).getTime() >= now)
          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
          .slice(0, this.arrivalsLimit)
          .map((r) => ({
            _id: r._id,
            clientName: r.clientName,
            roomNumber: r.roomNumber,
            checkIn: r.checkIn,
            status: r.status
          }))
      };
    } else {
      warnings.push(`reservations-service: ${reservationsResult.reason.message}`);
    }

    return {
      clients,
      roomsOccupied,
      lowStock,
      topProducts,
      rooms,
      lowStockItems,
      reservations,
      ...(warnings.length > 0 ? { warnings } : {})
    };
  }
}

module.exports = { DashboardFacade };
