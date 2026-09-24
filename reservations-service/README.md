# Reservations Service - Sistema de Gestión Hotelera

Microservicio de gestión de reservas anticipadas. Implementa:

- Patrón en capas: Controller → Validator → Service → Repository → Model/DB.
- **Abstract Factory** (`src/factories/reservationChannel.factory.ts`): según el
  canal de la reserva (`walk_in`, `phone`, `online`, `corporate`) se obtiene una
  familia completa y consistente de reglas de negocio: `PricingStrategy`
  (cómo se calcula el total), `CancellationPolicy` (plazo límite y penalidad de
  cancelación) y `ReservationNotificationBuilder` (contenido del evento que se
  publica). Agregar un canal nuevo implica agregar una fábrica concreta más,
  sin tocar `ReservationService`.
- RabbitMQ como **puente** con `rooms-service` (mismo exchange `hotel_events`
  que `auth-service` y `rooms-service`):
  - **Consume** `room.created` / `room.updated` / `room.status_changed` /
    `room.deleted` para mantener un read-model local (`RoomSnapshot`) y así
    validar habitación, precio y capacidad sin llamar por HTTP a `rooms-service`.
  - **Publica** `reservation.created`, `reservation.updated`,
    `reservation.confirmed`, `reservation.checked_in`,
    `reservation.checked_out`, `reservation.cancelled`.
  - `rooms-service` a su vez consume `reservation.checked_in` /
    `reservation.checked_out` para actualizar el estado físico de la
    habitación (`occupied` / `cleaning`) automáticamente.
- MongoDB local con una base exclusiva llamada `reservations_db`.
- JWT para autenticación: **no emite tokens**, solo valida los que emite
  `auth-service` (por eso `JWT_SECRET` debe ser idéntico en los tres servicios).
- Roles `admin` y `recepcionista`.

## Requisitos

- Node.js
- MongoDB ejecutándose localmente
- RabbitMQ ejecutándose localmente
- `auth-service` corriendo (emite el token)
- `rooms-service` corriendo (emite los eventos `room.*` que alimentan el snapshot)

## 1. Configuración

Copia `.env.example` como `.env` y revisa los valores.

`JWT_SECRET` y `RABBITMQ_EXCHANGE` deben tener el mismo valor que en
`auth-service/.env` y `rooms-service/.env`.

## 2. Instalar dependencias

```bash
npm install
```

## 3. Ejecutar

```bash
npm run dev
```

El servicio queda en `http://localhost:3002`.

## 4. Endpoints

Todos requieren `Authorization: Bearer <token>` (token emitido por `auth-service`).

### Health

`GET /health`

### Listar / detalle

`GET /api/reservations` — admin o recepcionista.
`GET /api/reservations/:id` — admin o recepcionista.

### Crear reserva

`POST /api/reservations` — admin o recepcionista.

```json
{
  "roomId": "<id de una habitación existente en rooms-service>",
  "clientName": "Juan Pérez",
  "clientDocument": "12345678",
  "clientPhone": "3001234567",
  "checkIn": "2026-01-10T15:00:00.000Z",
  "checkOut": "2026-01-12T12:00:00.000Z",
  "guests": 2,
  "channel": "online",
  "notes": "Llega en la noche"
}
```

`channel`: `walk_in` | `phone` | `online` | `corporate` — determina la fábrica
concreta usada para tarifa, política de cancelación y notificación.

### Editar (solo mientras está `pending`)

`PUT /api/reservations/:id` — admin o recepcionista.

### Transiciones de estado

- `PATCH /api/reservations/:id/confirm` — `pending` → `confirmed`
- `PATCH /api/reservations/:id/check-in` — `confirmed` → `checked_in` (dispara `room.status = occupied` vía RabbitMQ)
- `PATCH /api/reservations/:id/check-out` — `checked_in` → `checked_out` (dispara `room.status = cleaning` vía RabbitMQ)
- `PATCH /api/reservations/:id/cancel` — calcula penalidad según la política del canal

### Eliminar

`DELETE /api/reservations/:id` — solo admin.

## RabbitMQ / Broker

Exchange `hotel_events` (tipo `topic`, compartido con `auth-service` y `rooms-service`).

Publica: `reservation.created`, `reservation.updated`, `reservation.confirmed`,
`reservation.checked_in`, `reservation.checked_out`, `reservation.cancelled`.

Consume (cola `reservations.room_sync`): `room.created`, `room.updated`,
`room.status_changed`, `room.deleted`.
