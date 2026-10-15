import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fdate, fmt, initials, num, plural } from "../../lib/format";
import { accountOf, ROOM_CAP, ROOM_STATUS, ROOM_TYPE } from "../../lib/stay";
import { useResource } from "../../lib/useResource";
import { useTween } from "../../lib/useTween";
import { getStatsDirect, getStatsFacade, type DashboardMode, type DashboardStats } from "../../services/dashboardService";
import { getRoom } from "../../services/roomService";
import { getActiveStay } from "../../services/stayService";
import Icon from "../../ui/Icon";
import Overlay from "../../ui/Overlay";
import { Badge, ErrorCard, LoadChip, ModalHead, NoteBox } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import FacadeLab from "./FacadeLab";

const RES_LABEL: Record<string, { label: string; tone: "warn" | "info" | "ok" }> = {
  pending: { label: "Pendiente", tone: "warn" },
  confirmed: { label: "Confirmada", tone: "info" },
  checked_in: { label: "En casa", tone: "ok" },
};

const SERVICE_ROWS = [
  { name: "auth-service", text: "Inicio de sesión y usuarios", warn: null },
  { name: "rooms-service", text: "Habitaciones y estados", warn: "rooms-service" },
  { name: "reservations-service", text: "Reservas y su ciclo de vida", warn: "reservations-service" },
  { name: "clients-service", text: "Huéspedes", warn: "clients-service" },
  { name: "products-service", text: "Productos e inventario", warn: "products-service" },
  { name: "stays-service", text: "Estancias de mostrador y cuentas", warn: null },
];

// Habitación abierta desde una ventana de la fachada: se piden sus datos frescos.
async function loadRoomDetail(id: string) {
  const room = await getRoom(id);
  const stay = room.status === "occupied" ? await getActiveStay(id).catch(() => null) : null;
  return { room, stay };
}

function RoomModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const load = useMemo(() => () => loadRoomDetail(roomId), [roomId]);
  const detail = useResource(load);

  return (
    <Overlay label="Detalle de la habitación" onClose={onClose}>
      {(close) => {
        if (detail.status !== "ready" || !detail.data) {
          return (
            <>
              <ModalHead overline="rooms-service" title="Habitación" sub={detail.status === "error" ? detail.error : "Cargando…"} onClose={close} />
              {detail.status === "loading" && <div className="skel" style={{ height: 120 }} />}
            </>
          );
        }
        const { room, stay } = detail.data;
        const st = ROOM_STATUS[room.status];
        const acc = stay ? accountOf(stay) : null;
        const notes: Partial<Record<string, { tone: "ok" | "warn" | "info"; icon: "check" | "clock" | "info"; text: string }>> = {
          available: { tone: "ok", icon: "check", text: "Lista para recibir un huésped." },
          cleaning: { tone: "warn", icon: "clock", text: `Aseo en curso · tiempo estimado ${room.cleaningMinutes} minutos.` },
          maintenance: { tone: "info", icon: "info", text: "Fuera de servicio por revisión técnica." },
        };
        const note = notes[room.status];
        return (
          <>
            <div className="m-head">
              <div>
                <div className="overline">{ROOM_TYPE[room.type]}</div>
                <h2>Habitación {room.number}</h2>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
              <button className="icon-btn soft" onClick={close} aria-label="Cerrar"><Icon name="x" /></button>
            </div>
            {stay && acc && (
              <div className="sum-box">
                <div className="person">
                  <span className="av"><Icon name="key" /></span>
                  <div>
                    <div className="strong">Estancia de mostrador</div>
                    <div className="muted sm-text">Desde {fdate(stay.startedAt)} · {plural(acc.hours, "hora", "horas")}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="muted sm-text">Cuenta a la fecha</div>
                  <div className="amt-lg">{fmt(acc.total)}</div>
                </div>
              </div>
            )}
            {note && <NoteBox tone={note.tone} icon={note.icon}>{note.text}</NoteBox>}
            <div className="kv">
              <div><div className="k">Tarifa por noche</div><div className="v">{fmt(room.price)}</div></div>
              <div><div className="k">Capacidad</div><div className="v">{plural(room.capacity ?? ROOM_CAP[room.type], "persona", "personas")}</div></div>
              <div className="full">
                <div className="k">Comodidades</div>
                <div className="chips" style={{ marginTop: 6 }}>
                  {room.amenities.map((a) => <span key={a} className="chip-s">{a}</span>)}
                </div>
              </div>
            </div>
            <div className="m-foot">
              <button className="btn ghost" onClick={close}>Cerrar</button>
              <Link className="btn primary" to="/reception">
                {room.status === "available" ? "Hacer check-in" : room.status === "occupied" ? "Ver cuenta" : "Abrir en recepción"}
                <Icon name="arrow" className="arr" />
              </Link>
            </div>
          </>
        );
      }}
    </Overlay>
  );
}

function StockModal({ stats, onClose }: { stats: DashboardStats; onClose: () => void }) {
  return (
    <Overlay label="Productos por reponer" onClose={onClose}>
      {(close) => (
        <>
          <ModalHead
            overline="Inventario"
            title={`Hay ${num(stats.lowStock)} ${stats.lowStock === 1 ? "producto" : "productos"} por reponer`}
            sub={`Se avisa cuando un producto queda con 5 unidades o menos.${(stats.lowStock ?? 0) > stats.lowStockItems.length ? ` Aquí, los ${stats.lowStockItems.length} más urgentes.` : ""}`}
            onClose={close}
          />
          <div className="list">
            {stats.lowStockItems.map((p, i) => (
              <div key={p._id} className="li rise" style={{ "--i": i } as CSSProperties}>
                <span className="pico c-orange"><Icon name="product" /></span>
                <div className="li-main"><div className="strong">{p.name}</div></div>
                <Badge tone={p.stock === 0 ? "err" : "warn"}>{p.stock === 0 ? "Agotado" : `${p.stock} und.`}</Badge>
              </div>
            ))}
          </div>
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Ahora no</button>
            <Link className="btn primary" to="/inventory?vista=entrada">
              Registrar entrada
              <Icon name="arrow" className="arr" />
            </Link>
          </div>
        </>
      )}
    </Overlay>
  );
}

export default function Dashboard() {
  const { name } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // cargando | error | alerta | habitacion

  const [mode, setMode] = useState<DashboardMode>("facade");
  const [rtt, setRtt] = useState(0);
  const [modal, setModal] = useState<{ kind: "stock" } | { kind: "room"; id: string } | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [bannerOff, setBannerOff] = useState(false);

  // La función de carga cambia con el modo: useResource vuelve a pedir y mide de nuevo.
  const load = useMemo(() => () => (mode === "facade" ? getStatsFacade(rtt) : getStatsDirect(rtt)), [mode, rtt]);
  const res = useResource(load);

  const result = res.data;
  const stats = result?.stats ?? null;
  const forced = vista === "cargando" ? "loading" : vista === "error" ? "error" : null;
  const status = forced ?? res.status;
  const skeleton = forced === "loading" || (res.status === "loading" && !stats);

  const e = useTween(result ? `${mode}-${result.ms}` : "");

  // ?vista=alerta | habitacion abren su ventana apenas hay datos (una sola vez).
  let shown = modal;
  if (!shown && !vistaDone && stats) {
    if (vista === "alerta") shown = { kind: "stock" };
    if (vista === "habitacion") {
      const occ = stats.rooms.find((r) => r.status === "occupied") ?? stats.rooms[0];
      if (occ) shown = { kind: "room", id: occ._id };
    }
  }
  const closeModal = () => {
    setModal(null);
    setVistaDone(true);
  };

  const rooms = stats?.rooms ?? [];
  const count = (s: string) => rooms.filter((r) => r.status === s).length;
  const occupied = count("occupied");
  const pct = rooms.length ? Math.round((occupied / rooms.length) * 100 * e) : 0;

  // Fachada: los pisos más bajos, el más alto arriba. Con 100+ habitaciones solo caben unos pisos.
  const byFloor = new Map<number, typeof rooms>();
  [...rooms].sort((a, b) => a.number - b.number).forEach((r) => {
    const f = Math.floor(r.number / 100);
    byFloor.set(f, [...(byFloor.get(f) ?? []), r]);
  });
  const allFloors = [...byFloor.keys()].sort((a, b) => a - b);
  const floors = allFloors.slice(0, 3).reverse();
  let wi = 0;

  const services = (svc: (typeof SERVICE_ROWS)[number]) => !(svc.warn && stats?.warnings?.some((w) => w.startsWith(svc.warn!)));
  const lowCount = stats?.lowStock ?? 0;
  const topMax = Math.max(1, ...(stats?.topProducts.map((p) => p.total) ?? [1]));

  return (
    <Page
      title="Panel"
      service="api-gateway"
      subtitle={name ? `Así está el hotel hoy, ${name.split(" ")[0]}` : "Así está el hotel hoy"}
      actions={
        <Link className="btn primary plus" to="/reservations?vista=nueva">
          <Icon name="plus" />
          Nueva reserva
        </Link>
      }
    >
      {skeleton && (
        <div className="stack" aria-busy="true" aria-label="Cargando el panel">
          <div className="hero">
            <div className="card hero-card" style={{ minHeight: 300 }}>
              <div className="hero-txt">
                <div className="skel" style={{ width: 120, height: 14 }} />
                <div className="skel" style={{ width: 140, height: 40 }} />
                <div className="skel" style={{ width: 220, height: 16 }} />
                <div className="skel" style={{ width: 240, height: 60, marginTop: 8 }} />
              </div>
              <div className="skel" style={{ flex: "1 1 280px", maxWidth: 380, minHeight: 240, borderRadius: 20 }} />
            </div>
            <div className="kpis">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="card kpi">
                  <div className="skel" style={{ width: "60%", height: 12 }} />
                  <div className="skel" style={{ width: "50%", height: 30 }} />
                  <div className="skel" style={{ width: "80%", height: 12 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="skel" style={{ width: "45%", height: 16 }} />
                <div className="skel" style={{ height: 14 }} />
                <div className="skel" style={{ height: 14, width: "85%" }} />
                <div className="skel" style={{ height: 14, width: "70%" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <ErrorCard
          title="No pudimos cargar el panel"
          text={forced ? "El api-gateway no respondió. Revisa que los servicios estén encendidos e intenta de nuevo." : res.error}
          onRetry={() => (forced ? navigate("/dashboard") : res.reload())}
        />
      )}

      {stats && !skeleton && status !== "error" && (
        <div className={"stack page-in" + (res.refreshing ? " refreshing" : "")}>
          {!bannerOff && lowCount > 0 && (
            <div className="banner" role="status">
              <Icon name="inventory" />
              <span className="grow">
                {plural(lowCount, "producto quedó", "productos quedaron")} con poco stock. Repónlos antes de que se agoten en las habitaciones.
              </span>
              <button className="btn sm t-warn" onClick={() => setModal({ kind: "stock" })}>Ver cuáles</button>
              <button className="icon-btn soft" onClick={() => setBannerOff(true)} aria-label="Ocultar aviso"><Icon name="x" /></button>
            </div>
          )}

          <div className="hero">
            <section className="card hero-card rise" style={{ "--i": 0 } as CSSProperties} aria-label="Ocupación de hoy">
              <div className="hero-txt">
                <div className="overline">Ocupación hoy</div>
                <div className="amt-xl">{pct} %</div>
                <div className="muted">{occupied} de {rooms.length} habitaciones con huéspedes</div>
                <div className="legend">
                  <div className="lgd"><span className="sw sw-occ" />Ocupadas · {occupied}</div>
                  <div className="lgd"><span className="sw sw-av" />Disponibles · {count("available")}</div>
                  <div className="lgd"><span className="sw sw-cl" />En aseo · {count("cleaning")}</div>
                  <div className="lgd"><span className="sw sw-mt" />Mantenimiento · {count("maintenance")}</div>
                </div>
                <div className="muted sm-text">Toca una ventana para ver la habitación.</div>
                {allFloors.length > 3 && <div className="muted sm-text">Fachada: pisos {allFloors[0]}–{allFloors[2]} de {allFloors.length}.</div>}
              </div>
              <div className="facade" aria-label="Fachada del hotel">
                {floors.map((f) => (
                  <div key={f} className="floor">
                    {(byFloor.get(f) ?? []).slice(0, 4).map((r) => {
                      const i = wi++;
                      return (
                        <button
                          key={r._id}
                          className={"win " + r.status}
                          style={{ "--i": i } as CSSProperties}
                          onClick={() => setModal({ kind: "room", id: r._id })}
                          aria-label={`Habitación ${r.number}, ${ROOM_STATUS[r.status].label}. Ver detalle`}
                        >
                          <span className="wn">{r.number}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="door" />
              </div>
            </section>

            <div className="kpis">
              <section className="card kpi lift rise" style={{ "--i": 1 } as CSSProperties}>
                <div className="kpi-top"><span className="overline">Ocupadas ahora</span><span className="kico t-bal"><Icon name="room" /></span></div>
                <div className="amt-lg">{Math.round(occupied * e)}</div>
                <div className="muted sm-text">de {rooms.length} habitaciones</div>
              </section>
              <section className="card kpi lift rise" style={{ "--i": 2 } as CSSProperties}>
                <div className="kpi-top"><span className="overline">Reservas activas</span><span className="kico t-info"><Icon name="calendar" /></span></div>
                <div className="amt-lg">{num(Math.round((stats.reservations?.active ?? 0) * e))}</div>
                <div className="muted sm-text">Pendientes, confirmadas y en casa</div>
              </section>
              <section className="card kpi lift rise" style={{ "--i": 3 } as CSSProperties}>
                <div className="kpi-top"><span className="overline">Clientes</span><span className="kico t-ok"><Icon name="clients" /></span></div>
                <div className="amt-lg">{num(Math.round((stats.clients ?? 0) * e))}</div>
                <div className="muted sm-text">Registrados en el hotel</div>
              </section>
              <section className="card kpi lift rise" style={{ "--i": 4 } as CSSProperties}>
                <div className="kpi-top"><span className="overline">Por reponer</span><span className="kico t-warn"><Icon name="inventory" /></span></div>
                <div className="amt-lg">{num(Math.round(lowCount * e))}</div>
                <div className="muted sm-text">Productos con 5 unidades o menos</div>
              </section>
            </div>
          </div>

          <FacadeLab
            mode={mode}
            onMode={setMode}
            rtt={rtt}
            onRtt={setRtt}
            result={result}
            loading={res.status === "loading" || res.refreshing}
            onRerun={res.refresh}
          />

          <div className="grid">
            <section className="card rise" style={{ "--i": 5 } as CSSProperties}>
              <div className="card-head"><div><h3 className="h3">Lo más vendido</h3><div className="muted sm-text">Unidades consumidas en habitaciones</div></div></div>
              <div className="list">
                {stats.topProducts.map((p, i) => (
                  <div key={p._id} className="li">
                    <span className="rank">{i + 1}</span>
                    <div className="li-main">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span className="strong">{p.name ?? p._id}</span>
                        <span className="amt">{num(p.total)} und.</span>
                      </div>
                      <div className="bar-track"><div className="bar" style={{ width: `${(p.total / topMax) * 100 * e}%` }} /></div>
                    </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && <div className="empty">Todavía no hay consumos.</div>}
              </div>
            </section>

            <section className="card rise" style={{ "--i": 6 } as CSSProperties}>
              <div className="card-head">
                <div><h3 className="h3">Por reponer</h3><div className="muted sm-text">5 unidades o menos</div></div>
                <Link className="btn ghost sm" to="/inventory">Ver inventario</Link>
              </div>
              <div className="list">
                {stats.lowStockItems.slice(0, 5).map((p) => (
                  <div key={p._id} className="li">
                    <span className="pico c-orange"><Icon name="product" /></span>
                    <div className="li-main"><div className="strong">{p.name}</div></div>
                    <Badge tone={p.stock === 0 ? "err" : "warn"}>{p.stock === 0 ? "Agotado" : `${p.stock} und.`}</Badge>
                  </div>
                ))}
                {stats.lowStockItems.length === 0 && <div className="empty">Todo el inventario está en orden.</div>}
              </div>
            </section>

            <section className="card rise" style={{ "--i": 7 } as CSSProperties}>
              <div className="card-head">
                <div><h3 className="h3">Próximas llegadas</h3><div className="muted sm-text">Pendientes y confirmadas</div></div>
                <Link className="btn ghost sm" to="/reservations">Ver reservas</Link>
              </div>
              <div className="list">
                {(stats.reservations?.arrivals ?? []).map((a) => (
                  <div key={a._id} className="li">
                    <span className="av">{initials(a.clientName)}</span>
                    <div className="li-main">
                      <div className="strong">{a.clientName}</div>
                      <div className="muted sm-text">Hab. {a.roomNumber} · {fdate(a.checkIn)}</div>
                    </div>
                    <Badge tone={RES_LABEL[a.status]?.tone ?? "info"}>{RES_LABEL[a.status]?.label ?? a.status}</Badge>
                  </div>
                ))}
                {(stats.reservations?.arrivals.length ?? 0) === 0 && <div className="empty">No hay llegadas próximas.</div>}
              </div>
            </section>

            <section className="card rise" style={{ "--i": 8 } as CSSProperties}>
              <div className="card-head"><div><h3 className="h3">Servicios del sistema</h3><div className="muted sm-text">Cada módulo habla con su microservicio</div></div></div>
              <div className="list">
                {SERVICE_ROWS.map((svc) => (
                  <div key={svc.name} className="li">
                    <div className="li-main"><div className="svc">{svc.name}</div><div className="muted sm-text">{svc.text}</div></div>
                    <span className="chip" style={services(svc) ? undefined : { background: "var(--err-tint)", color: "var(--err)" }}>
                      <span className="dot" style={services(svc) ? undefined : { background: "var(--err)", color: "var(--err)", animation: "none" }} />
                      {services(svc) ? "En línea" : "Sin respuesta"}
                    </span>
                  </div>
                ))}
                <div className="li">
                  <div className="li-main"><div className="svc">api-gateway · RabbitMQ</div><div className="muted sm-text">Panel y eventos entre servicios</div></div>
                  <span className="chip"><span className="dot" />En línea</span>
                </div>
              </div>
            </section>
          </div>

          <div><LoadChip stats={res.stats} records={rooms.length + (stats.clients ?? 0) + (stats.reservations?.active ?? 0)} noun="registros procesados" /></div>
        </div>
      )}

      {shown?.kind === "stock" && stats && <StockModal stats={stats} onClose={closeModal} />}
      {shown?.kind === "room" && <RoomModal roomId={shown.id} onClose={closeModal} />}
    </Page>
  );
}
