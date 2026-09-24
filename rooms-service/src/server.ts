import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { connectRabbitMQ } from "./broker/rabbitmq";
import { startReservationConsumer } from "./broker/reservation.consumer";

const PORT = Number(process.env.PORT || 3001);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRabbitMQ();
    await startReservationConsumer();

    app.listen(PORT, () => {
      console.log(`[ROOMS] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[ROOMS] Health: http://localhost:${PORT}/health`);
      console.log(`[ROOMS] Habitaciones: GET http://localhost:${PORT}/api/rooms`);
    });
  } catch (error) {
    console.error("[ROOMS] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
