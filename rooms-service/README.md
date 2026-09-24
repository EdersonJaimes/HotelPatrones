# Rooms Service - Sistema de Gestión Hotelera

Microservicio de gestión de habitaciones. Implementa:

- Patrón en capas: Controller → Validator → Service → Repository → Model/DB.
- **Prototype** (único patrón de creación, `src/prototypes/room.prototype.ts`):
  mantiene una plantilla preconfigurada por tipo de habitación (precio sugerido,
  rango de precio permitido, capacidad, amenities, minutos de limpieza) y
  permite crear habitaciones clonando esa plantilla en vez de reconstruir todos
  sus atributos desde cero. También valida ahí mismo que el precio esté dentro
  del rango permitido para el tipo.
- RabbitMQ como Broker: publica eventos y **consume** los eventos de
  `reservations-service` para sincronizar el estado físico de la habitación
  (`reservation.checked_in` → `occupied`, `reservation.checked_out` → `cleaning`).
- MongoDB local con una base exclusiva llamada `rooms_db`.
- JWT: **no emite tokens**, solo valida los que emite `auth-service`
  (por eso `JWT_SECRET` debe ser idéntico en ambos servicios).
- Roles `admin` y `recepcionista`.

## Requisitos

- Node.js
- MongoDB ejecutándose localmente
- RabbitMQ ejecutándose localmente
- `auth-service` corriendo (es quien emite el token que este servicio valida)

## 1. Configuración

Copia `.env.example` como `.env`. `JWT_SECRET` debe tener el mismo valor que en `auth-service/.env`.

## 2. Instalar dependencias

```bash
npm install
```

## 3. Ejecutar

```bash
npm run dev
```

El servicio queda en `http://localhost:3001` (o el `PORT` que definas en `.env`).

## 4. Endpoints

Todos requieren `Authorization: Bearer <token>` (token emitido por `auth-service`).

### Health

`GET /health`

### Listar habitaciones

`GET /api/rooms` — admin o recepcionista.

### Obtener una habitación

`GET /api/rooms/:id` — admin o recepcionista.

### Crear habitación (a mano)

`POST /api/rooms` — solo admin.

```json
{
  "number": 101,
  "type": "doble",
  "price": 45000,
  "capacity": 2,
  "amenities": ["Wifi", "TV"]
}
```

`type`: `individual` | `doble` | `triple` | `suite`
`status` (opcional, default `available`): `available` | `occupied` | `cleaning` | `maintenance`

La Factory valida que `price` esté dentro del rango permitido para ese `type`.

### Patrón Prototype: listar plantillas disponibles

`GET /api/rooms/prototypes` — admin o recepcionista.

Devuelve la plantilla base (precio, capacidad, amenities, minutos de limpieza)
de cada tipo de habitación, útil para que el frontend muestre opciones rápidas
de creación.

### Patrón Prototype: crear habitación clonando una plantilla

`POST /api/rooms/prototypes/:type` — solo admin.

`:type` = `individual` | `doble` | `triple` | `suite`

Body mínimo (solo el número, todo lo demás sale clonado de la plantilla):

```json
{ "number": 205 }
```

Body con overrides opcionales (precio puntual, amenities o estado distintos a la plantilla):

```json
{
  "number": 205,
  "price": 50000,
  "amenities": ["Wifi", "TV", "Balcón"],
  "status": "available"
}
```

### Actualizar habitación

`PUT /api/rooms/:id` — solo admin. Body con cualquier subconjunto de los campos.

### Cambiar estado

`PATCH /api/rooms/:id/status` — admin o recepcionista.

```json
{ "status": "cleaning" }
```

### Eliminar habitación

`DELETE /api/rooms/:id` — solo admin.

## RabbitMQ / Broker

Exchange `hotel_events` (topic), compartido con el resto de microservicios.

**Publica:**

- `room.created`
- `room.updated`
- `room.status_changed`
- `room.deleted`

**Consume** (desde `reservations-service`):

- `reservation.checked_in` → pone la habitación en `occupied`
- `reservation.checked_out` → pone la habitación en `cleaning`
