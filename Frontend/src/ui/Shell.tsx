import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { kb, ms as fmtMs } from "../lib/format";
import { speedTone, usePerfEntries } from "../lib/perf";
import Icon, { type IconName } from "./Icon";
import Overlay, { CloseButton } from "./Overlay";
import { useTheme } from "./Theme";

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  roles: string[];
  short?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ALL = ["admin", "recepcionista"];

const SECTIONS: NavSection[] = [
  {
    label: "Operación",
    items: [
      { label: "Panel", path: "/dashboard", icon: "panel", roles: ["admin"] },
      { label: "Recepción", path: "/reception", icon: "reception", roles: ALL },
      { label: "Reservas", path: "/reservations", icon: "calendar", roles: ALL },
    ],
  },
  {
    label: "Hotel",
    items: [
      { label: "Habitaciones", path: "/rooms", icon: "room", roles: ["admin"], short: "Hotel" },
      { label: "Clientes", path: "/clients", icon: "clients", roles: ["admin"] },
    ],
  },
  {
    label: "Tienda",
    items: [
      { label: "Productos", path: "/products", icon: "product", roles: ["admin"] },
      { label: "Inventario", path: "/inventory", icon: "inventory", roles: ["admin"] },
    ],
  },
  { label: "Equipo", items: [{ label: "Usuarios", path: "/users", icon: "shield", roles: ["admin"], short: "Equipo" }] },
  { label: "Guía", items: [{ label: "42 pantallas", path: "/screens", icon: "grid", roles: ["admin"], short: "Pantallas" }] },
];

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", recepcionista: "Recepcionista" };

function useNav() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const sections = SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => role && i.roles.includes(role)) })).filter(
    (s) => s.items.length > 0
  );

  // Posición vertical del indicador animado: etiquetas de 28 px (+14 de margen) e ítems de 44 + 2.
  let y = 0;
  let indicator = -1;
  sections.forEach((s, si) => {
    y += (si === 0 ? 0 : 14) + 28;
    s.items.forEach((i) => {
      if (pathname.startsWith(i.path)) indicator = y;
      y += 46;
    });
  });

  return { sections, indicator, flat: sections.flatMap((s) => s.items) };
}

function Sidebar() {
  const [mini, setMini] = useState(false);
  const { name, role, logout } = useAuth();
  const navigate = useNavigate();
  const { sections, indicator } = useNav();

  return (
    <aside className={"sb" + (mini ? " mini" : "")}>
      <div className="brand">
        <div className="mark" aria-hidden="true">H</div>
        <div className="txt">
          <div className="brand-name">Hotel Patrones</div>
          <div className="brand-sub">Gestión hotelera</div>
        </div>
      </div>
      <nav className="nav" aria-label="Menú principal">
        {indicator >= 0 && (
          <div
            className="nav-ind"
            style={{ transform: `translateY(${indicator}px)`, transition: "transform var(--slow) var(--spring)", ["--y" as string]: `translateY(${indicator}px)` }}
          />
        )}
        {sections.map((s, si) => (
          <div key={s.label}>
            <div className={"nav-lbl" + (si === 0 ? " first" : "")}>
              <span className="txt">{s.label}</span>
            </div>
            {s.items.map((i) => (
              <NavLink key={i.path} to={i.path} className={({ isActive }) => "nav-it" + (isActive ? " on" : "")}>
                <Icon name={i.icon} />
                <span className="txt">{i.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <button className="nav-it collapse" onClick={() => setMini((m) => !m)} aria-label={mini ? "Expandir menú" : "Contraer menú"}>
          <Icon name="collapse" />
          <span className="txt">Contraer menú</span>
        </button>
        <div className="me">
          <span className="av">{(name ?? "?").slice(0, 2).toUpperCase()}</span>
          <div className="me-txt txt">
            <div className="me-name">{name}</div>
            <div className="me-role">{ROLE_LABEL[role ?? ""] ?? role}</div>
          </div>
          <button
            className="icon-btn soft"
            aria-label="Cerrar sesión"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomBar() {
  const { flat } = useNav();
  const { pathname } = useLocation();
  return (
    <nav className="bbar" aria-label="Menú inferior">
      {flat.slice(0, 5).map((i) => (
        <Link key={i.path} to={i.path} className={"bb-it" + (pathname.startsWith(i.path) ? " on" : "")}>
          <Icon name={i.icon} />
          {i.short ?? i.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const loc = useLocation();
  return (
    <div className="shell">
      <Sidebar />
      {/* key: al cambiar de pantalla (o de ?vista=) se reinicia el estado de la página */}
      <div className="main">
        <Outlet key={loc.pathname + loc.search} />
      </div>
      <BottomBar />
    </div>
  );
}

/* ---------- medidor de peticiones (ms) ---------- */
function PerfPill() {
  const entries = usePerfEntries();
  const [open, setOpen] = useState(false);
  const last = entries[0];
  const tone = last ? speedTone(last.ms) : "ok";

  return (
    <>
      <button className={"perf-pill " + (tone === "ok" ? "" : tone)} onClick={() => setOpen(true)} aria-label="Ver peticiones recientes y su tiempo">
        <Icon name="bolt" />
        {last ? (
          <>
            <span className="ms">{fmtMs(last.ms)}</span>
            <span className="muted">· {entries.length} peticiones</span>
          </>
        ) : (
          <span className="muted">sin peticiones</span>
        )}
      </button>
      {open && (
        <Overlay kind="drawer" label="Peticiones recientes" onClose={() => setOpen(false)}>
          {(close) => {
            const total = entries.reduce((s, e) => s + e.ms, 0);
            return (
              <>
                <div className="dw-head m-head">
                  <div>
                    <div className="overline">Rendimiento · navegador</div>
                    <h2>Peticiones recientes</h2>
                    <div className="muted sm-text">
                      {entries.length} peticiones · promedio {entries.length ? fmtMs(total / entries.length) : "—"}
                    </div>
                  </div>
                  <CloseButton onClick={close} />
                </div>
                <div className="dw-body">
                  <div className="reqs">
                    {entries.map((e) => (
                      <div key={e.id} className="req">
                        <span className="m">{e.method}</span>
                        <span className="u" title={e.url}>{e.url}</span>
                        <span className={"t " + (e.ok ? (speedTone(e.ms) === "ok" ? "" : speedTone(e.ms)) : "fail")}>{fmtMs(e.ms)}</span>
                        <span className="k">{e.ok ? kb(e.bytes) : e.status || "error"}</span>
                      </div>
                    ))}
                    {entries.length === 0 && <div className="muted">Aún no se ha hecho ninguna petición.</div>}
                  </div>
                </div>
                <div className="dw-foot">
                  <span className="sticky-hint">Verde &lt; 300 ms · ámbar &lt; 1 s · rojo ≥ 1 s</span>
                </div>
              </>
            );
          }}
        </Overlay>
      )}
    </>
  );
}

export function ThemeButton() {
  const { dark, toggle } = useTheme();
  return (
    <button className="icon-btn spinr" onClick={toggle} aria-label={dark ? "Usar tema claro" : "Usar tema oscuro"}>
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

/* ---------- cabecera + contenido de cada pantalla ---------- */
export function Page({
  title,
  service,
  subtitle,
  search,
  actions,
  children,
}: {
  title: string;
  service: string;
  subtitle: string;
  search?: { value: string; onChange: (value: string) => void; placeholder: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="top">
        <div className="title-wrap">
          <div className="title-row">
            <h1>{title}</h1>
            <span className="chip"><span className="dot" />{service}</span>
          </div>
          <div className="muted sm-text">{subtitle}</div>
        </div>
        <div className="top-tools">
          {search && (
            <label className="search">
              <Icon name="search" />
              <span className="sr">{search.label}</span>
              <input type="search" placeholder={search.placeholder} value={search.value} onChange={(e) => search.onChange(e.target.value)} />
            </label>
          )}
          <PerfPill />
          <ThemeButton />
          {actions}
        </div>
      </header>
      <main className="content">
        <div className="stack page-in">{children}</div>
      </main>
    </>
  );
}
