import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { getStats } from "../../services/dashboardService";

interface LowStockProduct {
  _id: string;
  name?: string;
  stock: number;
}

interface TopProduct {
  _id: string;
  name?: string;
  total: number;
}

interface Stats {
  clients: number;
  roomsOccupied: number;
  lowStock: number;
  lowStockProducts?: LowStockProduct[];
  lowStockThreshold?: number;
  topProducts?: TopProduct[];
}

export default function DashboardPage() {
  const { token, name } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;

        const data: Stats = await getStats(token);
        setStats(data);

        // 🔥 alerta inteligente: dice QUÉ productos están bajos
        if (data.lowStock > 0) {
          const names = (data.lowStockProducts ?? [])
            .map((p) => `${p.name ?? "Sin nombre"} (${p.stock})`)
            .join(", ");

          Swal.fire({
            title: "⚠️ Atención",
            text: names
              ? `Productos con bajo stock: ${names}`
              : "Hay productos con bajo stock",
            icon: "warning",
          });
        }

      } catch (error) {
        Swal.fire("Error", "No se pudieron cargar los datos", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return <p className="p-6">Cargando dashboard...</p>;
  }

  const lowStockProducts = stats?.lowStockProducts ?? [];
  const topProducts = stats?.topProducts ?? [];
  const maxTotal = Math.max(1, ...topProducts.map((p) => p.total));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Bienvenido, {name}
      </h1>

      {/* 🔥 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Clientes" value={stats?.clients} />
        <Card title="Habitaciones ocupadas" value={stats?.roomsOccupied} />
        <Card title="Bajo stock" value={stats?.lowStock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* 🔥 BAJO STOCK */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Productos con bajo stock
            {stats?.lowStockThreshold !== undefined && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (≤ {stats.lowStockThreshold} unidades)
              </span>
            )}
          </h2>

          <div className="bg-white rounded-2xl shadow p-4">
            {lowStockProducts.length ? (
              lowStockProducts.map((p) => (
                <div
                  key={p._id}
                  className="flex justify-between items-center border-b last:border-b-0 py-2"
                >
                  <span>{p.name ?? "Producto sin nombre"}</span>
                  <span
                    className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                      p.stock === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.stock === 0 ? "Agotado" : `${p.stock} und.`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Todo el inventario está bien abastecido</p>
            )}
          </div>
        </div>

        {/* 🔥 TOP PRODUCTOS */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Productos más consumidos
          </h2>

          <div className="bg-white rounded-2xl shadow p-4">
            {topProducts.length ? (
              topProducts.map((p, i) => (
                <div key={p._id} className="py-2">
                  <div className="flex justify-between">
                    <span>
                      <span className="text-gray-400 mr-2">{i + 1}.</span>
                      {p.name ?? "Producto eliminado"}
                    </span>
                    <span className="font-bold">{p.total} und.</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full"
                      style={{ inlineSize: `${(p.total / maxTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No hay datos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
