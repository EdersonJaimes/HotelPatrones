import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { role, name, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex justify-between items-center bg-slate-800 text-white px-6 py-3">

      <h1 className="font-bold">Sistema Hotel</h1>

      <div className="flex items-center gap-4">
        <span>👤 {role} : {name} Trabajando.</span>

        <button
          onClick={handleLogout}
          className="bg-red-500 px-3 py-1 rounded"
        >
          Cerrar sesión
        </button>
      </div>

    </div>
  );
}