# API Gateway - Sistema de Gestión Hotelera

Punto de entrada único (`http://localhost:3000`) que reparte las peticiones
del frontend hacia cada microservicio interno según el prefijo de la ruta.

| Ruta del frontend        | Se reenvía a                       |
|---------------------------|-------------------------------------|
| `/api/auth/*`             | auth-service (3010)                 |
| `/api/rooms/*`            | rooms-service (3001)                |
| `/api/reservations/*`     | reservations-service (3002)         |
| `/api/products/*`         | products-service (3003)             |
| `/api/inventory/*`        | products-service (3003)             |
| `/api/clients/*`          | clients-service (3004)              |
| `/api/stays/*`            | stays-service (3005)                |
| `GET /api/dashboard/stats`| **Facade** (no es proxy, ver abajo) |

## Dashboard: patrón Facade (BFF)

`GET /api/dashboard/stats` no se reenvía: `src/facades/dashboard.facade.js`
consulta en paralelo rooms, products, clients y reservations (cada uno con su cliente en
`src/facades/subsystem/`) y devuelve `{ clients, roomsOccupied, lowStock, topProducts, rooms,
lowStockItems, reservations }` (todo lo que pinta el Panel del Frontend).
Usa `Promise.allSettled`: si un servicio está caído, responde con lo que sí pudo
obtener y deja el motivo en `warnings`.

## Configuración

```bash
copy .env.example .env
npm install
npm run dev
```

`auth-service` debe usar `PORT=3010` (el 3000 es del gateway).

## Con Docker

Desde la raíz del repo: `docker compose up --build`. El gateway recibe las URLs
internas por variables de entorno (`http://auth-service:3010`, etc.).
