import api from "./api";

// El token lo agrega el interceptor de api.ts.
export const getStats = async () => {
  try {
    const response = await api.get("/dashboard/stats");
    return response.data;
  } catch (error: any) {
    console.error("Error en getStats:", error.response?.data || error.message);
    throw error;
  }
};
