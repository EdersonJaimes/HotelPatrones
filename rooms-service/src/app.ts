import cors from "cors";
import express from "express";
import roomRoutes from "./routes/room.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/rooms", roomRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "rooms-service",
    status: "UP"
  });
});

export default app;
