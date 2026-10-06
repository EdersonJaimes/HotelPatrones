import cors from "cors";
import express from "express";
import stayRoutes from "./routes/stay.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/stays", stayRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "stays-service",
    status: "UP"
  });
});

export default app;
