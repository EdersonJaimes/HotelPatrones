
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
    // Cada servicio entrega ya el resumen (conteos y las pocas filas que se muestran), así que
    // por la red interna viajan unos bytes y no las listas completas de clientes, inventario y reservas.
    const [roomsResult, inventoryResult, topConsumedResult, clientsResult, reservationsResult] =
      await Promise.allSettled([
        this.roomsClient.fetchRooms(authorization),
        this.productsClient.fetchSummary(authorization),
        this.productsClient.fetchTopConsumed(authorization, this.topProductsLimit),
        this.clientsClient.fetchCount(authorization),
        this.reservationsClient.fetchSummary(authorization)
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

    let lowStock = null;
    let lowStockItems = [];

    if (inventoryResult.status === "fulfilled") {
      lowStock = inventoryResult.value.lowStock;
      lowStockItems = inventoryResult.value.lowStockItems;
    } else {
      warnings.push(`products-service (inventory): ${inventoryResult.reason.message}`);
    }

    // El top ya trae el nombre del producto (viene del kardex).
    const topProducts =
      topConsumedResult.status === "fulfilled"
        ? topConsumedResult.value
        : (warnings.push(`products-service (top-consumed): ${topConsumedResult.reason.message}`), []);

    const clients =
      clientsResult.status === "fulfilled"
        ? clientsResult.value.count
        : (warnings.push(`clients-service: ${clientsResult.reason.message}`), null);

    let reservations = null;

    if (reservationsResult.status === "fulfilled") {
      reservations = {
        active: reservationsResult.value.active,
        arrivals: reservationsResult.value.arrivals.map((r) => ({
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
