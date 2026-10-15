# HotelPatrones - Sistema de Gestión Hotelera

Microservicios en Node/TypeScript + frontend React, comunicados por HTTP (a través
de un API Gateway) y por eventos (RabbitMQ). El proyecto aplica patrones de diseño:
Facade, Abstract Factory, Prototype y arquitectura en capas.

## Levantar todo con Docker

```bash
docker compose up --build
```

| Qué            | URL                                   |
|----------------|---------------------------------------|
| Frontend       | http://localhost:5173                 |
| API Gateway    | http://localhost:3000                 |
| RabbitMQ panel | http://localhost:15672 (guest/guest)  |

Usuario inicial: `admin` / `admin123` (rol admin). Desde "Usuarios" se crean los recepcionistas.

Los valores por defecto (secreto JWT, admin inicial, umbral de bajo stock) se
cambian copiando `.env.example` a `.env` en la raíz.

Solo la infraestructura, para desarrollar con `npm run dev`:

```bash
docker compose up -d mongo rabbitmq
```

Cada servicio tiene su `.env.example`; copia como `.env` y usa el mismo `JWT_SECRET` en todos.

## Datos de ejemplo (~20 000 registros) y pantallas

```bash
node docs/presentacion/seed-20000.js        # con el sistema encendido; tarda unos minutos
```

Siembra 8 000 clientes, 1 200 productos, 6 000 movimientos de kardex, 4 500 reservas, 120 habitaciones,
~200 estancias de mostrador y 6 usuarios de recepción (contraseña `hotel123`). Con ese volumen se ven los
cambios de tiempo (ms) en el Panel: **Laboratorio · Facade vs. sin Facade** compara 1 petición al gateway
contra 5 peticiones del navegador (y descarga de ~10 KB contra varios MB). Desde la terminal:
`node docs/presentacion/medir-tiempos.js resultados.json`.

El diseño de las 42 pantallas está implementado en el Frontend: la ruta `/screens` las lista y cada estado
se abre con `?vista=` (ver `Frontend/README.md`).

## Servicios

| Servicio              | Puerto | Base de datos     | Responsabilidad                                   |
|-----------------------|--------|-------------------|---------------------------------------------------|
| api-gateway           | 3000   | -                 | Punto de entrada, proxy y Facade del dashboard    |
| auth-service          | 3010   | auth_db           | Login, usuarios y emisión de JWT                  |
| rooms-service         | 3001   | rooms_db          | Habitaciones (Prototype)                          |
| reservations-service  | 3002   | reservations_db   | Reservas anticipadas (Abstract Factory)           |
| products-service      | 3003   | products_db       | Productos, inventario y kardex                    |
| clients-service       | 3004   | clients_db        | Clientes (huéspedes)                              |
| stays-service         | 3005   | stays_db          | Estancias de mostrador: iniciar, consumos, cuenta |
| Frontend              | 5173   | -                 | React + Vite, servido con nginx en Docker         |

Cada servicio tiene su propio README con endpoints y eventos.

## Cómo se conectan

- El navegador solo habla con el **gateway** (`/api/...`), que reparte por prefijo.
  `GET /api/dashboard/stats` no es un proxy: la Facade del gateway consulta rooms,
  products, clients y reservations y arma una sola respuesta.
- **Eventos** (exchange `hotel_events`): rooms publica `room.*` y reservations los
  consume para mantener su copia de habitaciones; reservations publica
  `reservation.checked_in/out` y rooms ajusta el estado físico; stays publica
  `stay.started`, `stay.product_added` y `stay.checked_out`.
- **HTTP síncrono** solo donde hace falta el resultado al instante: stays llama a
  rooms (leer y cambiar estado) y a products (precio y descuento de stock), reenviando
  el token del usuario.
