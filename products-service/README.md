# Products Service - Sistema de Gestión Hotelera

Microservicio de **productos e inventario** (catálogo, stock y kardex).

- Patrón en capas: Routes → Validators → Controllers → Services → Repositories → Models/DB.
- RabbitMQ mediante el **BrokerFacade** (`src/broker/broker.facade.ts`): el servicio
  publica eventos con `broker.publish(...)` sin tocar `amqplib` directamente.
- MongoDB local con una base exclusiva: `products_db`.
- JWT: **no emite tokens**, solo valida los que emite `auth-service`
  (`JWT_SECRET` debe ser idéntico en ambos servicios).
- Roles `admin` y `recepcionista`.

## Requisitos

- Node.js, MongoDB y RabbitMQ en ejecución (los mismos contenedores de Docker de los otros servicios)
- `auth-service` corriendo (emite el token que este servicio valida)

## 1. Configuración

Copia `.env.example` como `.env`. `JWT_SECRET` debe tener el mismo valor que en `auth-service/.env`.

## 2. Instalar y ejecutar

```bash
npm install
npm run dev
```

Queda en `http://localhost:3003`.

## 3. Endpoints

Todos requieren `Authorization: Bearer <token>`.

### Productos — `/api/products`

| Método | Ruta                | Rol                    |
|--------|---------------------|------------------------|
| GET    | /api/products       | admin o recepcionista  |
| GET    | /api/products/:id   | admin o recepcionista  |
| POST   | /api/products       | admin                  |
| PUT    | /api/products/:id   | admin                  |
| DELETE | /api/products/:id   | admin                  |

Body para crear/editar (`category`: `Bebida` | `Snack` | `Aseo` | `General`, por defecto `General`):

```json
{ "name": "Agua 600ml", "price": 2500, "category": "Bebida" }
```

El nombre es único sin distinguir mayúsculas (409 si ya existe).
El `stock` **no** se puede fijar por aquí: solo cambia con los endpoints de inventario.

### Inventario — `/api/inventory`

| Método | Ruta                                  | Rol                    |
|--------|---------------------------------------|------------------------|
| GET    | /api/inventory                        | admin o recepcionista  |
| POST   | /api/inventory/add                    | admin o recepcionista  |
| POST   | /api/inventory/remove                 | admin o recepcionista  |
| GET    | /api/inventory/movements/:productId   | admin o recepcionista  |
| GET    | /api/inventory/movements?limit=100    | admin o recepcionista  |

```json
{ "productId": "<id>", "quantity": 10, "reason": "Compra a proveedor" }
```

- `GET /api/inventory` → `[{ "_id", "product": { "_id", "name" }, "stock" }]`
- `GET /api/inventory/movements/:productId` → kardex, más reciente primero:
  `[{ "_id", "product": { "_id", "name" }, "type": "IN" | "OUT", "quantity", "reason", "date" }]`
- `GET /api/inventory/movements?limit=N` → kardex general (últimos N movimientos de todos los productos, máx. 500).
- `GET /api/inventory/top-consumed?limit=N` admite hasta 5000 (la tabla de productos lo usa para "vendidos").
- Descontar más de lo disponible responde `400` con `Stock insuficiente: disponible X, solicitado Y`.

## 4. Decisiones de diseño

- **Productos e inventario en un solo servicio**: el stock es un atributo del producto,
  así el descuento es una única operación atómica (`{ stock >= cantidad }` + `$inc`) y nunca
  puede quedar negativo aunque dos peticiones lleguen a la vez.
- **Kardex resistente a bajas**: cada movimiento guarda una copia del nombre del producto,
  por lo que el historial se conserva legible si el producto se elimina.
- **Consistencia sin transacciones**: Mongo standalone no las ofrece, así que si falla el
  registro del movimiento se revierte el cambio de stock (compensación).
- Los errores inesperados (500) no se exponen al cliente: se registran en consola y se
  responde un mensaje genérico.

## 5. RabbitMQ / Broker

Exchange `hotel_events` (topic), compartido con el resto de microservicios.

**Publica:**

| Routing key                | Cuándo                                                        |
|----------------------------|---------------------------------------------------------------|
| `product.created`          | Se crea un producto                                           |
| `product.updated`          | Se edita un producto                                          |
| `product.deleted`          | Se elimina un producto                                        |
| `inventory.stock_changed`  | Entra o sale stock (`type`: `IN` / `OUT`)                     |
| `inventory.low_stock`      | El stock **baja hasta** `LOW_STOCK_THRESHOLD` (o menos). Se publica al cruzar el umbral, no en cada descuento |

Por ahora este servicio **no consume** eventos de otros servicios.
