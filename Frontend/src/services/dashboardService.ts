import api from "./api";

export interface DashboardStats {
  clients: number | null;
  roomsOccupied: number | null;
  lowStock: number | null;
  topProducts: { _id: string; name?: string; total: number }[];
}

export interface StatsResult {
  stats: DashboardStats;
  requests: number; // cuántas peticiones HTTP hizo el navegador
  ms: number; // tiempo total medido en el navegador
}

// Debe coincidir con LOW_STOCK_THRESHOLD de products-service y del gateway.
const LOW_STOCK_THRESHOLD = 5;

// ✅ CON FACADE: el navegador hace UNA petición. El gateway consulta rooms,
// products y clients, y devuelve el objeto ya combinado.
export const getStats = async (): Promise<StatsResult> => {
  const start = performance.now();
  const res = await api.get("/dashboard/stats");

  return { stats: res.data, requests: 1, ms: performance.now() - start };
};

// ❌ SIN FACADE (solo para la demo): el navegador debe conocer cada servicio,
// pedir los 4 recursos y combinarlos él mismo. Las 4 peticiones van en paralelo
// (el caso más favorable para esta variante).
export const getStatsWithoutFacade = async (): Promise<StatsResult> => {
  const start = performance.now();

  const [rooms, inventory, top, clients] = await Promise.all([
    api.get("/rooms"),
    api.get("/inventory"),
    api.get("/inventory/top-consumed", { params: { limit: 5 } }),
    api.get("/clients"),
  ]);

  const names = new Map<string, string>(
    inventory.data.map((row: any) => [String(row.product._id), row.product.name])
  );

  const stats: DashboardStats = {
    clients: clients.data.length,
    roomsOccupied: rooms.data.filter((r: any) => r.status === "occupied").length,
    lowStock: inventory.data.filter((row: any) => row.stock <= LOW_STOCK_THRESHOLD).length,
    topProducts: top.data.map((item: any) => ({
      ...item,
      name: names.get(String(item._id)) ?? String(item._id),
    })),
  };

  return { stats, requests: 4, ms: performance.now() - start };
};
