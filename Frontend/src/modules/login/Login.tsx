import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    if (loading) return;

    if (!form.username || !form.password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        "http://localhost:3000/api/auth/login",
        form
      );

      const { token, role, name } = res.data;

      // Guardar en contexto
      login(token, role, name);

      // Redirección por rol
      if (role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/reception");
      }

    } catch (err: any) {
      console.error(err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Error al iniciar sesión");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-black to-slate-800">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        className="w-[350px] bg-white p-8 rounded-xl shadow-lg"
      >
        <div className="text-center text-3xl mb-2">🏨</div>

        <h2 className="text-center text-xl font-semibold mb-6">
          Iniciar sesión
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        {/* Usuario */}
        <label className="text-sm">Usuario</label>
        <input
          type="text"
          name="username"
          placeholder="Ingrese su usuario"
          value={form.username}
          onChange={handleChange}
          className="w-full p-2 mt-1 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Contraseña */}
        <label className="text-sm">Contraseña</label>
        <input
          type="password"
          name="password"
          placeholder="Ingrese su contraseña"
          value={form.password}
          onChange={handleChange}
          className="w-full p-2 mt-1 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex justify-between text-xs mb-4">
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            Recordarme
          </label>

          <span className="text-blue-500 cursor-pointer">
            ¿Olvidó su contraseña?
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full p-3 text-white rounded-md transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-400 hover:bg-blue-500"
          }`}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}