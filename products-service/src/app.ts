import cors from "cors";
import express from "express";
import inventoryRoutes from "./routes/inventory.routes";
import productRoutes from "./routes/product.routes";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "products-service",
    status: "UP"
  });
});

export default app;
