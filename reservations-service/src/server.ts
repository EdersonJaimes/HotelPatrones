import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { connectRabbitMQ } from "./broker/rabbitmq";
import { startRoomSyncConsumer } from "./broker/roomSync.consumer";

const PORT = Number(process.env.PORT || 3002);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRabbitMQ();
    await startRoomSyncConsumer();

    app.listen(PORT, () => {
      console.log(`[RESERVATIONS] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[RESERVATIONS] Health: http://localhost:${PORT}/health`);
      console.log(`[RESERVATIONS] Reservas: GET http://localhost:${PORT}/api/reservations`);
    });
  } catch (error) {
    console.error("[RESERVATIONS] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
