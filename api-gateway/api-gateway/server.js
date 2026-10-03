require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { DashboardFacade } = require("./src/facades/dashboard.facade");
const { RoomsClient } = require("./src/facades/subsystem/rooms.client");
const { ProductsClient } = require("./src/facades/subsystem/products.client");
const { ClientsClient } = require("./src/facades/subsystem/clients.client");

const app = express();

// CORS se resuelve UNA sola vez aquí, en el gateway. Los microservicios
// internos no necesitan preocuparse por el origen del navegador porque
// nunca reciben peticiones directas de él.
app.use(cors());

// IMPORTANTE: no usar express.json() aquí. http-proxy-middleware necesita
// reenviar el stream del body tal cual llega; si lo consumimos antes con
// un body-parser, el microservicio de destino recibiría un body vacío.

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3010";
const ROOMS_URL = process.env.ROOMS_SERVICE_URL || "http://localhost:3001";
const RESERVATIONS_URL = process.env.RESERVATIONS_SERVICE_URL || "http://localhost:3002";
const PRODUCTS_URL = process.env.PRODUCTS_SERVICE_URL || "http://localhost:3003";
const CLIENTS_URL = process.env.CLIENTS_SERVICE_URL || "http://localhost:3004";

function proxyTo(target, label) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    onError(err, _req, res) {
      console.error(`[GATEWAY] Error contactando ${label} (${target}):`, err.message);
      res.status(502).json({
        message: `${label} no está disponible en este momento. ¿Está corriendo en ${target}?`
      });
    },
    logLevel: "warn"
  });
}

app.use("/api/auth", proxyTo(AUTH_URL, "auth-service"));
app.use("/api/rooms", proxyTo(ROOMS_URL, "rooms-service"));
app.use("/api/reservations", proxyTo(RESERVATIONS_URL, "reservations-service"));
app.use("/api/products", proxyTo(PRODUCTS_URL, "products-service"));
app.use("/api/inventory", proxyTo(PRODUCTS_URL, "products-service"));
app.use("/api/clients", proxyTo(CLIENTS_URL, "clients-service"));

const dashboardFacade = new DashboardFacade(
  new RoomsClient(ROOMS_URL),
  new ProductsClient(PRODUCTS_URL),
  new ClientsClient(CLIENTS_URL),
  { lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD) || 5 }
);

// Único endpoint del gateway que NO es un simple proxy: agrega datos de
// rooms-service y products-service en una sola respuesta (patrón Facade / BFF).
app.get("/api/dashboard/stats", async (req, res) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    res.status(401).json({ message: "Token requerido" });
    return;
  }

  try {
    const stats = await dashboardFacade.getStats(authorization);
    res.status(200).json(stats);
  } catch (error) {
    console.error("[GATEWAY] Error armando el dashboard:", error.message);
    res.status(500).json({ message: "No se pudo construir el dashboard" });
  }
});

app.get("/health", (_req, res) => {
  res.status(200).json({ service: "api-gateway", status: "UP" });
});

const PORT = Number(process.env.PORT || 3000);

const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.log(`[GATEWAY] Escuchando en http://localhost:${actualPort}`);
  console.log(`[GATEWAY] /api/auth         -> ${AUTH_URL}`);
  console.log(`[GATEWAY] /api/rooms        -> ${ROOMS_URL}`);
  console.log(`[GATEWAY] /api/reservations -> ${RESERVATIONS_URL}`);
  console.log(`[GATEWAY] /api/products     -> ${PRODUCTS_URL}`);
  console.log(`[GATEWAY] /api/clients      -> ${CLIENTS_URL}`);
});

module.exports = server;
