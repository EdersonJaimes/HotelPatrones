import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { getStats, getStatsWithoutFacade, type DashboardStats, type StatsResult } from "../../services/dashboardService";

export default function DashboardPage() {
  const { token, name } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<{ requests: number; ms: number } | null>(null);
  const [useFacade, setUseFacade] = useState(true);
  const [loading, setLoading] = useState(true);

  // Se vuelve a pedir cada vez que se cambia de modo, para comparar en vivo.
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;

        const result: StatsResult = useFacade
          ? await getStats()
          : await getStatsWithoutFacade();

        setStats(result.stats);
        setMetrics({ requests: result.requests, ms: result.ms });
      } catch {
        Swal.fire("Error", "No se pudieron cargar los datos", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, useFacade]);

  if (loading) {
    return <p className="p-6">Cargando dashboard...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Bienvenido, {name}
      </h1>

      {/* Selector de modo + métricas de la última carga */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="inline-flex rounded-lg overflow-hidden border">
          <button
            onClick={() => setUseFacade(true)}
            className={`px-4 py-2 text-sm ${useFacade ? "bg-emerald-600 text-white" : "bg-white"}`}
          >
            Con Facade
          </button>
          <button
            onClick={() => setUseFacade(false)}
            className={`px-4 py-2 text-sm ${!useFacade ? "bg-rose-600 text-white" : "bg-white"}`}
          >
            Sin Facade
          </button>
        </div>

        {metrics && (
          <p className="text-sm text-gray-600">
            Peticiones del navegador: <b>{metrics.requests}</b> · Tiempo:{" "}
            <b>{metrics.ms.toFixed(0)} ms</b>
          </p>
        )}
      </div>

      {/* 🔥 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Clientes" value={stats?.clients} />
        <Card title="Habitaciones ocupadas" value={stats?.roomsOccupied} />
        <Card title="Bajo stock" value={stats?.lowStock} />
      </div>

      {/* 🔥 TOP PRODUCTOS */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Productos más consumidos
        </h2>

        <div className="bg-white rounded-2xl shadow p-4">
          {stats?.topProducts?.length ? (
            stats.topProducts.map((p, i) => (
              <div
                key={i}
                className="flex justify-between border-b py-2"
              >
                <span>{p.name ?? p._id}</span>
                <span className="font-bold">{p.total}</span>
              </div>
            ))
          ) : (
            <p>No hay datos</p>
          )}
        </div>
      </div>
    </div>
  );
}
