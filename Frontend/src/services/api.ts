import axios from "axios";
import { recordRequest } from "../lib/perf";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    perfStart?: number;
  }
}

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

  config.perfStart = performance.now();

  return config;
});

// Tamaño aproximado de lo descargado: content-length si el gateway lo manda,
// si no, el largo del JSON re-serializado.
function sizeOf(headers: Record<string, unknown> | undefined, data: unknown): number {
  const header = Number(headers?.["content-length"]);
  if (Number.isFinite(header) && header > 0) return header;
  if (data == null) return 0;
  try {
    return typeof data === "string" ? data.length : JSON.stringify(data).length;
  } catch {
    return 0;
  }
}

function log(
  config: { method?: string; url?: string; perfStart?: number } | undefined,
  status: number,
  ok: boolean,
  headers: Record<string, unknown> | undefined,
  data: unknown
) {
  if (!config || config.perfStart === undefined) return;
  recordRequest({
    method: (config.method ?? "get").toUpperCase(),
    url: config.url ?? "",
    status,
    ok,
    start: config.perfStart,
    ms: performance.now() - config.perfStart,
    bytes: sizeOf(headers, data),
  });
}

// Token vencido o inválido: se limpia la sesión y se vuelve al login, en vez de
// dejar la pantalla con errores silenciosos. El 401 del propio login (credenciales
// incorrectas) no cuenta: ahí Login.tsx muestra el mensaje.
api.interceptors.response.use(
  (response) => {
    log(response.config, response.status, true, response.headers as Record<string, unknown>, response.data);
    return response;
  },
  (error) => {
    log(error.config, error.response?.status ?? 0, false, error.response?.headers, error.response?.data);

    const isLogin = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLogin) {
      localStorage.clear();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
