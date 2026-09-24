# Auth Service - Sistema de Gestión Hotelera

Microservicio local de autenticación. Implementa:

- Patrón en capas: Controller → Validator → Service → Repository → Model/DB.
- RabbitMQ como Broker para publicar eventos.
- MongoDB local con una base exclusiva llamada `auth_db`.
- JWT para autenticación.
- Roles `admin` y `recepcionista`.

## Requisitos

- Node.js
- MongoDB ejecutándose localmente
- RabbitMQ ejecutándose localmente

## 1. Configuración

Copia `.env.example` como `.env` y revisa los valores.

La conexión por defecto es:

`mongodb://127.0.0.1:27017/auth_db`

RabbitMQ:

`amqp://127.0.0.1:5672`

## 2. Instalar dependencias

```bash
npm install
```

## 3. Ejecutar

```bash
npm run dev
```

El servicio queda en:

`http://localhost:3000`

## 4. Usuario administrador inicial

Si `auth_db` no tiene usuarios, el servicio crea automáticamente el usuario indicado en `.env`:

- username: `admin`
- password: `admin123`
- role: `admin`

Cambia estos valores en `.env` si lo deseas.

## 5. Endpoints

### Health

`GET /health`

### Login

`POST /api/auth/login`

Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Respuesta compatible con el frontend actual:

```json
{
  "token": "...",
  "role": "admin",
  "name": "Administrador",
  "user": {
    "id": "...",
    "username": "admin",
    "name": "Administrador",
    "role": "admin"
  }
}
```

### Crear usuario

Requiere token de administrador.

`POST /api/auth/users`

```json
{
  "username": "recepcion1",
  "name": "Recepcionista 1",
  "password": "123456",
  "role": "recepcionista"
}
```

### Usuario autenticado

`GET /api/auth/me`

Header:

`Authorization: Bearer <token>`

## RabbitMQ / Broker

El microservicio crea el exchange `hotel_events` de tipo `topic`.

Eventos publicados actualmente:

- `auth.user.created`
- `auth.user.logged_in`

Cuando construyamos `rooms-service`, ese servicio podrá consumir los eventos que necesite mediante RabbitMQ. No se debe hacer que Auth conozca directamente la implementación interna de Rooms.
