import cors from "cors";
import express from "express";
import clientRoutes from "./routes/client.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/clients", clientRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "clients-service",
    status: "UP"
  });
});

export default app;
