import axios from "axios";

// Único cliente HTTP del frontend: todo pasa por el API Gateway, que reparte
// hacia cada microservicio. La URL se puede cambiar con VITE_API_URL (se fija
// al compilar, ver Frontend/Dockerfile).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Token vencido o inválido: se limpia la sesión y se vuelve al login, en vez de
// dejar la pantalla con errores silenciosos. El 401 del propio login (credenciales
// incorrectas) no cuenta: ahí Login.tsx muestra el mensaje.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLogin) {
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
