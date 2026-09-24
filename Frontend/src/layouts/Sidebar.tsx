import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const { role } = useAuth();
  const navigate = useNavigate();

  const menuAdmin = [
    { name: "Dashboard", path: "/dashboard", icon: "📊"},
    { name: "Habitaciones", path: "/rooms", icon: "🏨" },
    { name: "Reservas", path: "/reservations", icon: "🗓️" },
    { name: "Clientes", path: "/clients", icon: "👤" },
    { name: "Usuarios", path: "/users", icon: "🧑‍💼" },
    { name: "Productos", path: "/products", icon: "📦" },
    { name: "Inventario", path: "/inventory", icon: "📦" },
    { name: "Recepcion", path: "/reception", icon: "📦" },

  ];

  const menuRecep = [
    { name: "Recepción", path: "/reception", icon: "🛎️" },
    { name: "Reservas", path: "/reservations", icon: "🗓️" },
  ];

  const menu = role === "admin" ? menuAdmin : menuRecep;

  return (
    <div
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={`h-screen bg-slate-900 text-white transition-all duration-300 
      ${collapsed ? "w-[70px]" : "w-[220px]"}`}
    >
      {/* Logo */}
      <div className="text-center py-4 text-xl">
        🏨
      </div>

      {/* Menu */}
      <div className="flex flex-col">
        {menu.map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800 transition"
          >
            <span>{item.icon}</span>

            {!collapsed && (
              <span className="text-sm">{item.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}