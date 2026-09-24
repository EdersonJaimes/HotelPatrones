import axios from "axios";

const API = "http://localhost:3000/api/dashboard";

// instancia (reutilizable luego)
const dashboardApi = axios.create({
  baseURL: API,
});

// obtener estadísticas
export const getStats = async (token: string) => {
  try {
    const response = await dashboardApi.get("/stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;

  } catch (error: any) {
    console.error("Error en getStats:", error.response?.data || error.message);
    throw error;
  }
};