import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { broker } from "./broker/broker.facade";

const PORT = Number(process.env.PORT || 3003);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await broker.connect();

    app.listen(PORT, () => {
      console.log(`[PRODUCTS] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[PRODUCTS] Health: http://localhost:${PORT}/health`);
      console.log(`[PRODUCTS] Productos: GET http://localhost:${PORT}/api/products`);
      console.log(`[PRODUCTS] Inventario: GET http://localhost:${PORT}/api/inventory`);
    });
  } catch (error) {
    console.error("[PRODUCTS] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
