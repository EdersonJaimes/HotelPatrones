require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

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
app.use("/api/stays", proxyTo(RESERVATIONS_URL, "reservations-service"));
app.use("/api/products", proxyTo(PRODUCTS_URL, "products-service"));

app.get("/health", (_req, res) => {
  res.status(200).json({ service: "api-gateway", status: "UP" });
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`[GATEWAY] Escuchando en http://localhost:${PORT}`);
  console.log(`[GATEWAY] /api/auth      -> ${AUTH_URL}`);
  console.log(`[GATEWAY] /api/rooms     -> ${ROOMS_URL}`);
  console.log(`[GATEWAY] /api/stays     -> ${RESERVATIONS_URL}`);
  console.log(`[GATEWAY] /api/products  -> ${PRODUCTS_URL}`);
});
