import cors from "cors";
import express from "express";
import reservationRoutes from "./routes/reservation.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/reservations", reservationRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "reservations-service",
    status: "UP"
  });
});

export default app;
