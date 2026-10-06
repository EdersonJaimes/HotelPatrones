# Stays Service - Sistema de Gestión Hotelera

Microservicio de **estancias de mostrador**: el recepcionista ocupa una habitación,
carga consumos (productos) y cierra la cuenta. Es lo que usa la pantalla "Recepción".

- Patrón en capas: Routes → Validators → Controllers → Services → Repositories → Models.
- RabbitMQ mediante el **BrokerFacade**; publica eventos `stay.*`.
- MongoDB con base exclusiva `stays_db`.
- JWT: no emite tokens, valida los de `auth-service` (`JWT_SECRET` idéntico).

## Ejecutar

Copia `.env.example` como `.env`, luego `npm install && npm run dev`. Queda en `http://localhost:3005`.
Necesita `rooms-service` y `products-service` corriendo.

## Endpoints — `/api/stays`

Todos requieren token de `admin` o `recepcionista`.

| Método | Ruta                      | Body                                 | Resultado                                  |
|--------|---------------------------|--------------------------------------|--------------------------------------------|
| POST   | /api/stays/start          | `{ roomId }`                         | Crea la estancia y pone la habitación `occupied` |
| POST   | /api/stays/add-product    | `{ stayId, productId, quantity }`    | Descuenta stock y suma el consumo          |
| POST   | /api/stays/checkout       | `{ stayId }`                         | Cierra y devuelve `{ hours, roomTotal, productsTotal, total }`; la habitación pasa a `cleaning` |
| GET    | /api/stays/active/:roomId | -                                    | Estancia activa (404 si no hay)            |
| GET    | /api/stays?status=        | -                                    | Historial (`active` / `closed`)            |

## Reglas de negocio

- **Tarifa**: el precio de la habitación es por noche; la estancia se cobra por hora a
  `precio / 24` (redondeado), **por hora iniciada y mínimo 1 hora**.
- Solo una estancia activa por habitación: lo garantiza un índice único parcial en Mongo.
- El checkout es atómico (`active` → `closed`): un doble clic no cobra dos veces.
- El consumo guarda nombre y precio del producto al momento de agregarlo.

## Consistencia sin transacciones

Mongo standalone no tiene transacciones entre servicios, así que cada operación que toca
otro servicio tiene compensación:

- `start`: si no se puede ocupar la habitación, se borra la estancia.
- `add-product`: si la estancia se cerró entre medio, se devuelve el stock.
- `checkout`: si la habitación no pasa a `cleaning`, se reabre la estancia.

## Eventos

**Publica**: `stay.started`, `stay.product_added`, `stay.checked_out`. No consume eventos.
