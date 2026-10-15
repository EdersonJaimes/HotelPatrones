import { Link } from "react-router-dom";
import { Page } from "../../ui/Shell";

interface Screen {
  n: number;
  title: string;
  to: string;
}

interface Phase {
  title: string;
  service: string;
  screens: Screen[];
}

// Las 42 pantallas del diseño. Cada una abre la pantalla real con ?vista= para dejarla en ese estado
// (modal abierto, cargando, error, validación…), con los datos de los microservicios.
const PHASES: Phase[] = [
  {
    title: "Vista general",
    service: "api-gateway · auth-service",
    screens: [
      { n: 1, title: "App · todos los microservicios", to: "/dashboard" },
      { n: 2, title: "Inicio de sesión", to: "/login" },
    ],
  },
  {
    title: "Fase 1 · Panel",
    service: "api-gateway (Facade)",
    screens: [
      { n: 3, title: "Panel · interactivo", to: "/dashboard" },
      { n: 4, title: "Panel · cargando", to: "/dashboard?vista=cargando" },
      { n: 5, title: "Panel · error al cargar", to: "/dashboard?vista=error" },
      { n: 6, title: "Modal · productos por reponer", to: "/dashboard?vista=alerta" },
      { n: 7, title: "Modal · detalle de habitación", to: "/dashboard?vista=habitacion" },
    ],
  },
  {
    title: "Fase 2 · Recepción",
    service: "rooms-service · stays-service · products-service",
    screens: [
      { n: 8, title: "Recepción · interactivo", to: "/reception" },
      { n: 9, title: "Modal · check-in", to: "/reception?vista=checkin" },
      { n: 10, title: "Modal · cuenta abierta", to: "/reception?vista=cuenta" },
      { n: 11, title: "Cuenta · stock insuficiente", to: "/reception?vista=stock" },
      { n: 12, title: "Modal · confirmar check-out", to: "/reception?vista=checkout" },
      { n: 13, title: "Modal · cuenta final", to: "/reception?vista=factura" },
      { n: 14, title: "Modal · terminar aseo", to: "/reception?vista=aseo" },
    ],
  },
  {
    title: "Fase 3 · Reservas",
    service: "reservations-service",
    screens: [
      { n: 15, title: "Reservas · interactivo", to: "/reservations" },
      { n: 16, title: "Panel lateral · nueva reserva", to: "/reservations?vista=nueva" },
      { n: 17, title: "Nueva reserva · validación", to: "/reservations?vista=validacion" },
      { n: 18, title: "Panel lateral · detalle", to: "/reservations?vista=detalle" },
      { n: 19, title: "Modal · cancelar con penalidad", to: "/reservations?vista=cancelar" },
    ],
  },
  {
    title: "Fase 4 · Habitaciones",
    service: "rooms-service",
    screens: [
      { n: 20, title: "Habitaciones · interactivo", to: "/rooms" },
      { n: 21, title: "Panel lateral · crear desde plantilla", to: "/rooms?vista=nueva" },
      { n: 22, title: "Panel lateral · editar", to: "/rooms?vista=editar" },
      { n: 23, title: "Modal · cambiar estado", to: "/rooms?vista=estado" },
      { n: 24, title: "Modal · eliminar", to: "/rooms?vista=eliminar" },
    ],
  },
  {
    title: "Fase 5 · Clientes",
    service: "clients-service",
    screens: [
      { n: 25, title: "Clientes · interactivo", to: "/clients" },
      { n: 26, title: "Panel lateral · nuevo cliente", to: "/clients?vista=nuevo" },
      { n: 27, title: "Panel lateral · historial", to: "/clients?vista=detalle" },
      { n: 28, title: "Modal · eliminar", to: "/clients?vista=eliminar" },
      { n: 29, title: "Búsqueda sin resultados", to: "/clients?vista=vacio" },
    ],
  },
  {
    title: "Fase 6 · Productos",
    service: "products-service",
    screens: [
      { n: 30, title: "Productos · interactivo", to: "/products" },
      { n: 31, title: "Panel lateral · nuevo producto", to: "/products?vista=nuevo" },
      { n: 32, title: "Panel lateral · editar", to: "/products?vista=editar" },
      { n: 33, title: "Modal · eliminar", to: "/products?vista=eliminar" },
    ],
  },
  {
    title: "Fase 7 · Inventario",
    service: "products-service",
    screens: [
      { n: 34, title: "Inventario · interactivo", to: "/inventory" },
      { n: 35, title: "Kardex de movimientos", to: "/inventory?vista=kardex" },
      { n: 36, title: "Modal · registrar entrada", to: "/inventory?vista=entrada" },
      { n: 37, title: "Modal · salida sin stock", to: "/inventory?vista=salida" },
      { n: 38, title: "Panel lateral · historial del producto", to: "/inventory?vista=historial" },
    ],
  },
  {
    title: "Fase 8 · Usuarios",
    service: "auth-service",
    screens: [
      { n: 39, title: "Usuarios · interactivo", to: "/users" },
      { n: 40, title: "Panel lateral · nuevo usuario", to: "/users?vista=nuevo" },
      { n: 41, title: "Panel lateral · editar", to: "/users?vista=editar" },
      { n: 42, title: "Modal · eliminar", to: "/users?vista=eliminar" },
    ],
  },
];

export default function Screens() {
  return (
    <Page title="42 pantallas" service="Catálogo" subtitle="Cada pantalla del diseño, abierta con datos reales de los microservicios">
      {PHASES.map((phase) => (
        <section key={phase.title} className="card">
          <div className="card-head">
            <div>
              <h3 className="h3">{phase.title}</h3>
              <div className="muted sm-text svc">{phase.service}</div>
            </div>
          </div>
          <div className="cat-grid">
            {phase.screens.map((s) => (
              <Link key={s.n} to={s.to} className="cat-item">
                <span className="cat-n">{String(s.n).padStart(2, "0")}</span>
                <span>
                  <div className="cat-t">{s.title}</div>
                  <div className="cat-s">{s.to}</div>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
