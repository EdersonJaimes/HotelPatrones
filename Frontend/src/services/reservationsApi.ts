import axios from "axios";

const reservationsApi = axios.create({
  baseURL: "http://localhost:3002/api",
});

// INTERCEPTOR
reservationsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default reservationsApi;
