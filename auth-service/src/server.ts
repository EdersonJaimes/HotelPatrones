import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";
import { connectRabbitMQ } from "./broker/rabbitmq";
import { AuthService } from "./services/auth.service";

const PORT = Number(process.env.PORT || 3000);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await connectRabbitMQ();
    await new AuthService().ensureInitialAdmin();

    app.listen(PORT, () => {
      console.log(`[AUTH] Servicio ejecutándose en http://localhost:${PORT}`);
      console.log(`[AUTH] Health: http://localhost:${PORT}/health`);
      console.log(`[AUTH] Login: POST http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error("[AUTH] No se pudo iniciar el microservicio:", error);
    process.exit(1);
  }
}

startServer();
