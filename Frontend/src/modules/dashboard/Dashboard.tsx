import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { getStats } from "../../services/dashboardService";
interface Stats {
  clients: number;
  roomsOccupied: number;
  lowStock: number;
  topProducts?: { _id: string; total: number }[];
}

export default function DashboardPage() {
  const { token, name } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) return;

        const data = await getStats(token);
        setStats(data);

        // 🔥 alerta inteligente
        if (data.lowStock > 0) {
          Swal.fire({
            title: "⚠️ Atención",
            text: "Hay productos con bajo stock",
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
                <span>Producto ID: {p._id}</span>
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
