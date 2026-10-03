# Clients Service - Sistema de Gestión Hotelera

Microservicio de **clientes** (huéspedes): alta, consulta, edición y baja.

- Patrón en capas: Routes → Validators → Controllers → Services → Repositories → Models/DB.
- RabbitMQ mediante el **BrokerFacade** (`src/broker/broker.facade.ts`): publica
  eventos con `broker.publish(...)` sin tocar `amqplib` directamente.
- MongoDB local con una base exclusiva: `clients_db`.
- JWT: **no emite tokens**, solo valida los que emite `auth-service`
  (`JWT_SECRET` debe ser idéntico en ambos servicios).
- Roles `admin` y `recepcionista`.

## Requisitos

- Node.js, MongoDB y RabbitMQ en ejecución (los mismos contenedores Docker de los otros servicios)
- `auth-service` corriendo (emite el token que este servicio valida)

## 1. Configuración

Copia `.env.example` como `.env`. `JWT_SECRET` debe tener el mismo valor que en `auth-service/.env`.

## 2. Instalar y ejecutar

```bash
npm install
npm run dev
```

Queda en `http://localhost:3004`.

## 3. Endpoints — `/api/clients`

Todos requieren `Authorization: Bearer <token>`.

| Método | Ruta              | Rol                    |
|--------|-------------------|-------------------------|
| GET    | /api/clients      | admin o recepcionista   |
| GET    | /api/clients/:id  | admin o recepcionista   |
| POST   | /api/clients      | admin o recepcionista   |
| PUT    | /api/clients/:id  | admin o recepcionista   |
| DELETE | /api/clients/:id  | admin                   |

Body para crear/editar:

```json
{ "name": "Juan Pérez", "document": "123456789", "phone": "3001234567" }
```

- `document` y `phone` aceptan número o texto (el formulario del frontend usa
  `<input type="number">`); el servidor los normaliza a string y valida que
  sean solo dígitos (document: 5-20, phone: 7-15).
- `document` es único: crear o editar con uno repetido responde `409`.

## 4. RabbitMQ / Broker

Exchange `hotel_events` (topic), compartido con el resto de microservicios.

**Publica:** `client.created`, `client.updated`, `client.deleted`.

Por ahora este servicio no consume eventos de otros servicios.
