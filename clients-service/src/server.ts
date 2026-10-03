import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { broker } from "./broker/broker.facade";

const PORT = Number(process.env.PORT || 3004);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await broker.connect();

    app.listen(PORT, () => {
      console.log(`[CLIENTS] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[CLIENTS] Health: http://localhost:${PORT}/health`);
      console.log(`[CLIENTS] Clientes: GET http://localhost:${PORT}/api/clients`);
    });
  } catch (error) {
    console.error("[CLIENTS] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
