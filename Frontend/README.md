# Frontend - Hotel Patrones

React 19 + TypeScript + Vite. Habla únicamente con el **api-gateway** (`VITE_API_URL`, por defecto
`http://localhost:3000/api`). El diseño (tokens MonyMonty, tema claro/oscuro) está en `src/styles/`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Pantallas

El diseño tiene 42 pantallas; en la app son 9 módulos y el resto son sus estados (modales, paneles
laterales, cargando, error, validación). Cada estado se abre con `?vista=`, por ejemplo
`/reception?vista=checkin` o `/inventory?vista=salida`. La ruta **`/screens`** (menú "42 pantallas")
lista las 42 con su enlace.

| Módulo        | Ruta            | Microservicio(s)                                   |
|---------------|-----------------|-----------------------------------------------------|
| Login         | `/login`        | auth-service                                        |
| Panel         | `/dashboard`    | api-gateway (Facade) · rooms · products · clients · reservations |
| Recepción     | `/reception`    | rooms-service · stays-service · products-service    |
| Reservas      | `/reservations` | reservations-service (Abstract Factory) · rooms     |
| Habitaciones  | `/rooms`        | rooms-service (Prototype)                           |
| Clientes      | `/clients`      | clients-service · reservations-service (historial)  |
| Productos     | `/products`     | products-service                                    |
| Inventario    | `/inventory`    | products-service (stock y kardex)                   |
| Usuarios      | `/users`        | auth-service                                        |

## Rendimiento: con Facade y sin Facade

- **Medidor de la barra superior**: cada petición HTTP queda registrada (ms y KB). Al hacer clic se ve la lista.
- **Chip "⚡ 54 ms · 2.24 MB · 2 peticiones"** en cada tabla: lo que costó cargarla.
- **Panel → Laboratorio**: alterna *Con Facade* (1 petición a `/dashboard/stats`) y *Sin Facade* (5 peticiones
  que el navegador combina), con diagrama del flujo, cascada de tiempos, latencia simulada por petición y un
  comparador (media, mediana y p95) de los tres modos: Facade, sin Facade en paralelo y sin Facade en serie.

Las listas (clientes, productos, reservas) se piden completas, como hace el backend, y se paginan en el
navegador: con miles de registros se nota cuánto pesa cada petición.

> En desarrollo (`npm run dev`) React StrictMode ejecuta cada carga dos veces, así que el Panel puede mostrar
> el doble de peticiones. En el build de producción (Docker) se ve el número real.

## Estructura

```
src/
  modules/      una carpeta por pantalla (Panel, Recepción, Reservas...)
  ui/           Shell (menú + cabecera), Overlay (modal/panel), Toast, Theme, piezas comunes
  services/     un archivo por microservicio; todo pasa por api.ts (axios + medición)
  lib/          formato, medición (perf), useResource, paginación
  styles/       hotel.css (diseño), login.css, extras.css
```
