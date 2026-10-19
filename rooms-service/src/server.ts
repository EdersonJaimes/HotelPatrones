import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { broker } from "./broker/broker.facade";
import { startReservationConsumer } from "./broker/reservation.consumer";
import { RoomService } from "./services/room.service";

const PORT = Number(process.env.PORT || 3001);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    // Flyweight: los documentos anteriores aún traen su copia de capacity y
    // cleaningMinutes; se quitan porque ahora los comparte el flyweight del tipo.
    const cleaned = await new RoomService().dropIntrinsicCopies();
    if (cleaned > 0) {
      console.log(`[ROOMS] Flyweight: ${cleaned} habitaciones sin copias del estado intrínseco`);
    }

    await broker.connect();
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
