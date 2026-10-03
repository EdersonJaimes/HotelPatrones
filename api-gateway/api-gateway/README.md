# API Gateway - Sistema de Gestión Hotelera

Punto de entrada único (`http://localhost:3000`) que reparte las peticiones
del frontend hacia cada microservicio interno según el prefijo de la ruta.
El frontend NO cambia nada: sigue apuntando a `http://localhost:3000/api`.

| Ruta del frontend | Se reenvía a           |
|--------------------|-------------------------|
| `/api/auth/*`       | auth-service (puerto 3010) |
| `/api/rooms/*`      | rooms-service (puerto 3001) |
| `/api/stays/*`      | reservations-service (puerto 3002) |
| `/api/products/*`   | products-service (puerto 3003, futuro) |

## ⚠️ Antes de usar el gateway

`auth-service` debe dejar de usar el puerto 3000 (porque ahora lo usa el
gateway). Cambia en `auth-service/.env`:

```
PORT=3010
```

`rooms-service` ya usa 3001 por defecto, no hay que tocarlo.

## 1. Configuración

```bash
copy .env.example .env
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Ejecutar

```bash
npm run dev
```

## 4. Orden recomendado para levantar todo

1. `docker compose up -d` (infra: Mongo + RabbitMQ)
2. `auth-service` → `npm run dev` (ahora en 3010)
3. `rooms-service` → `npm run dev` (3001)
4. `reservations-service` → `npm run dev` (3002, cuando esté listo)
5. `api-gateway` → `npm run dev` (3000, el que ve el frontend)
6. Frontend → `npm run dev` (sin cambios)

Si algún microservicio interno no está corriendo, el gateway responde
`502` con un mensaje claro indicando cuál servicio falta, en vez de
colgarse sin explicación.
