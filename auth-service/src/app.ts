import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "auth-service",
    status: "UP"
  });
});

export default app;
