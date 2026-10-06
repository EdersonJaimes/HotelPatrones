import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { broker } from "./broker/broker.facade";
import { Stay } from "./models/stay.model";

const PORT = Number(process.env.PORT || 3005);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    // Garantiza el índice único parcial (una sola estancia activa por habitación)
    // antes de aceptar tráfico: es lo que protege contra dos "Iniciar" simultáneos.
    await Stay.init();
    await broker.connect();

    app.listen(PORT, () => {
      console.log(`[STAYS] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[STAYS] Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("[STAYS] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
