import { useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { errMsg, fdate, fmt, plural } from "../../lib/format";
import { accountOf, ROOM_CAP, ROOM_STATUS, ROOM_TYPE } from "../../lib/stay";
import { useResource } from "../../lib/useResource";
import { getRooms, setRoomStatus } from "../../services/roomService";
import { listStays, startStay } from "../../services/stayService";
import type { Checkout, Room, RoomStatus, Stay } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay from "../../ui/Overlay";
import { Badge, BusyButton, ConfirmHead, Empty, ErrorCard, LoadChip, ModalHead, NoteBox, Seg } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { useToast } from "../../ui/Toast";
import { AccountModal, CheckoutModal, InvoiceModal } from "./StayModals";

type Filter = "all" | RoomStatus;

type ModalState =
  | { kind: "checkin"; room: Room }
  | { kind: "account"; room: Room; preset?: "stock" }
  | { kind: "checkout"; room: Room; stay: Stay }
  | { kind: "invoice"; room: Room | null; stay: Stay; result: Checkout }
  | { kind: "aseo"; room: Room }
  | { kind: "lastInvoice" };

// Habitaciones + estancias abiertas (para mostrar la cuenta en cada tarjeta).
async function loadBoard() {
  const [rooms, stays] = await Promise.all([getRooms(), listStays("active")]);
  return { rooms: rooms.sort((a, b) => a.number - b.number), stays };
}

function CheckinModal({ room, onClose, onStarted }: { room: Room; onClose: () => void; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const hourly = Math.round(room.price / 24);

  const confirm = async () => {
    setBusy(true);
    setErr("");
    try {
      await startStay(room._id);
      onStarted();
    } catch (e) {
      setErr(errMsg(e, "No se pudo iniciar la estancia"));
      setBusy(false);
    }
  };

  return (
    <Overlay label={`Check-in habitación ${room.number}`} onClose={onClose}>
      {(close) => (
        <>
          <ModalHead
            overline="Check-in · mostrador"
            title={`Habitación ${room.number}`}
            sub={`${ROOM_TYPE[room.type]} · ${fmt(room.price)} por noche`}
            onClose={close}
          />
          <div className="sum-box">
            <div>
              <div className="strong">Tarifa por hora</div>
              <div className="muted sm-text">{fmt(room.price)} ÷ 24 horas</div>
            </div>
            <span className="amt-lg">{fmt(hourly)}</span>
          </div>
          <NoteBox tone="info">
            Se abre la cuenta y la habitación pasa a ocupada. El hospedaje se cobra por hora iniciada (mínimo una) y los consumos se agregan después.
          </NoteBox>
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label="Registrar entrada" busyLabel="Registrando…" onClick={confirm} />
          </div>
        </>
      )}
    </Overlay>
  );
}

function AseoModal({ room, onClose, onDone }: { room: Room; onClose: () => void; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      await onDone();
    } catch (e) {
      setErr(errMsg(e, "No se pudo actualizar la habitación"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Terminar aseo" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead
            icon="spark"
            tone="warn"
            title={`¿Terminó el aseo de la ${room.number}?`}
            text={`La ${ROOM_TYPE[room.type].toLowerCase()} quedará disponible para un nuevo check-in. El aseo de este tipo toma unos ${room.cleaningMinutes} minutos.`}
          />
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Todavía no</button>
            <BusyButton busy={busy} label="Sí, dejar disponible" busyLabel="Guardando…" onClick={confirm} />
          </div>
        </>
      )}
    </Overlay>
  );
}

const loadClosed = () => listStays("closed");

// Para ?vista=factura: muestra la cuenta final de la última estancia cerrada.
function LastInvoice({ rooms, onClose }: { rooms: Room[]; onClose: () => void }) {
  const closed = useResource(loadClosed);
  const stay = closed.data?.[0];

  if (closed.status === "loading") return null;
  if (!stay || stay.total === undefined) {
    return (
      <Overlay size="sm" label="Cuenta final" onClose={onClose}>
        {(close) => (
          <>
            <ConfirmHead icon="receipt" tone="info" title="Aún no hay cuentas cerradas" text="Haz un check-out y aquí verás la cuenta final." />
            <div className="m-foot"><button className="btn primary" onClick={close}>Listo</button></div>
          </>
        )}
      </Overlay>
    );
  }
  const result: Checkout = {
    stayId: stay._id,
    roomNumber: stay.roomNumber,
    hours: stay.hours ?? 1,
    roomTotal: stay.roomTotal ?? 0,
    productsTotal: stay.productsTotal ?? 0,
    total: stay.total,
  };
  return <InvoiceModal room={rooms.find((r) => r._id === stay.roomId) ?? null} stay={stay} result={result} onClose={onClose} />;
}

export default function Reception() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // checkin | cuenta | stock | checkout | factura | aseo

  const board = useResource(loadBoard);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [just, setJust] = useState<string | null>(null);

  const rooms = board.data?.rooms ?? [];
  const stayOf = (roomId: string) => board.data?.stays.find((s) => s.roomId === roomId);

  // ?vista=: abre el estado del diseño con datos reales apenas llegan (una sola vez).
  let shown = modal;
  if (!shown && !vistaDone && board.data) {
    const first = (s: RoomStatus) => rooms.find((r) => r.status === s);
    if (vista === "checkin" && first("available")) shown = { kind: "checkin", room: first("available")! };
    if ((vista === "cuenta" || vista === "stock") && first("occupied")) shown = { kind: "account", room: first("occupied")!, preset: vista === "stock" ? "stock" : undefined };
    if (vista === "checkout" && first("occupied") && stayOf(first("occupied")!._id)) shown = { kind: "checkout", room: first("occupied")!, stay: stayOf(first("occupied")!._id)! };
    if (vista === "aseo" && first("cleaning")) shown = { kind: "aseo", room: first("cleaning")! };
    if (vista === "factura") shown = { kind: "lastInvoice" };
  }
  const close = () => {
    setModal(null);
    setVistaDone(true);
  };
  const open = (m: ModalState) => {
    setModal(m);
    setVistaDone(true);
  };

  const flash = (roomId: string) => {
    setJust(roomId);
    setTimeout(() => setJust((j) => (j === roomId ? null : j)), 700);
  };

  const count = (s: RoomStatus) => rooms.filter((r) => r.status === s).length;
  const query = q.trim().toLowerCase();
  const list = rooms
    .filter((r) => filter === "all" || r.status === filter)
    .filter((r) => !query || String(r.number).includes(query) || ROOM_TYPE[r.type].toLowerCase().includes(query));

  const finishCleaning = async (room: Room) => {
    await setRoomStatus(room._id, "available");
    setModal(null);
    setVistaDone(true);
    flash(room._id);
    board.refresh();
    toast(`Habitación ${room.number} lista para recibir`, "ok", {
      label: "Deshacer",
      run: async () => {
        await setRoomStatus(room._id, "cleaning");
        board.refresh();
      },
    });
  };

  return (
    <Page
      title="Recepción"
      service="stays-service"
      subtitle="Check-in, cuentas de habitación y aseo"
      search={{ value: q, onChange: setQ, placeholder: "Número o tipo de habitación", label: "Buscar habitaciones" }}
    >
      {board.status === "error" && <ErrorCard title="No pudimos cargar las habitaciones" text={board.error} onRetry={board.reload} />}

      {board.status !== "error" && (
        <>
          <div className="bar-row">
            <Seg<Filter>
              label="Filtrar habitaciones"
              value={filter}
              onChange={setFilter}
              items={[
                { key: "all", label: "Todas", count: rooms.length },
                { key: "available", label: "Disponibles", count: count("available") },
                { key: "occupied", label: "Ocupadas", count: count("occupied") },
                { key: "cleaning", label: "En aseo", count: count("cleaning") },
                { key: "maintenance", label: "Mantenimiento", count: count("maintenance") },
              ]}
            />
            <div className="row-btns" style={{ alignItems: "center" }}>
              <span className="muted sm-text">{query ? `${list.length} de ${rooms.length} habitaciones` : `${count("available")} disponibles para check-in`}</span>
              <LoadChip stats={board.stats} records={rooms.length} noun="habitaciones" />
            </div>
          </div>

          {board.status === "loading" ? (
            <div className="rooms" aria-busy="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="skel" style={{ height: 210, borderRadius: 18 }} />)}
            </div>
          ) : (
            <div className={"rooms" + (board.refreshing ? " refreshing" : "")}>
              {list.map((r, i) => {
                const st = ROOM_STATUS[r.status];
                const stay = stayOf(r._id);
                const acc = stay ? accountOf(stay) : null;
                return (
                  <article
                    key={r._id}
                    className={`room rise s-${r.status}` + (just === r._id ? " just" : "")}
                    style={{ "--i": Math.min(i, 12) } as CSSProperties}
                    aria-label={`Habitación ${r.number}, ${st.label}`}
                  >
                    <div className="room-head">
                      <div>
                        <div className="room-n">{r.number}</div>
                        <div className="muted sm-text">{ROOM_TYPE[r.type]} · {plural(r.capacity ?? ROOM_CAP[r.type], "persona", "personas")}</div>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="room-note">
                      {r.status === "occupied" && stay && <span className="av xs"><Icon name="key" /></span>}
                      <div>
                        <div className="note-main">
                          {r.status === "occupied" ? "Estancia de mostrador" : r.status === "available" ? "Lista para recibir" : r.status === "cleaning" ? "Aseo en curso" : "Fuera de servicio"}
                        </div>
                        <div className="muted sm-text">
                          {r.status === "occupied" && stay ? `Desde ${fdate(stay.startedAt)}`
                            : r.status === "available" ? r.amenities.slice(0, 3).join(" · ")
                            : r.status === "cleaning" ? `Unos ${r.cleaningMinutes} minutos`
                            : "Revisión técnica"}
                        </div>
                      </div>
                    </div>
                    <div><span className="amt">{fmt(r.price)}</span><span className="muted sm-text"> / noche</span></div>
                    {r.status === "available" && (
                      <button className="btn primary full" onClick={() => open({ kind: "checkin", room: r })}>
                        <Icon name="key" />Check-in
                      </button>
                    )}
                    {r.status === "occupied" && (
                      <button className="btn ghost full" onClick={() => open({ kind: "account", room: r })}>
                        <Icon name="receipt" />Ver cuenta{acc ? ` · ${fmt(acc.total)}` : ""}
                      </button>
                    )}
                    {r.status === "cleaning" && (
                      <button className="btn t-warn full" onClick={() => open({ kind: "aseo", room: r })}>
                        <Icon name="check" />Terminar aseo
                      </button>
                    )}
                    {r.status === "maintenance" && <button className="btn ghost full" disabled>Fuera de servicio</button>}
                  </article>
                );
              })}
            </div>
          )}

          {board.status === "ready" && list.length === 0 && (
            <div className="card">
              <Empty title={query ? `Nada coincide con “${q.trim()}”` : "No hay habitaciones en este estado"}>
                Prueba con otro número de habitación o tipo.
              </Empty>
            </div>
          )}
        </>
      )}

      {shown?.kind === "checkin" && (
        <CheckinModal
          room={shown.room}
          onClose={close}
          onStarted={() => {
            const room = shown.room;
            setModal({ kind: "account", room: { ...room, status: "occupied" } });
            flash(room._id);
            board.refresh();
            toast(`Check-in listo · habitación ${room.number}`);
          }}
        />
      )}
      {shown?.kind === "account" && (
        <AccountModal
          room={shown.room}
          preset={shown.preset}
          onClose={close}
          onCheckout={(stay) => open({ kind: "checkout", room: shown.room, stay })}
        />
      )}
      {shown?.kind === "checkout" && (
        <CheckoutModal
          room={shown.room}
          stay={shown.stay}
          onClose={close}
          onBack={() => open({ kind: "account", room: shown.room })}
          onDone={(result) => {
            open({ kind: "invoice", room: shown.room, stay: shown.stay, result });
            flash(shown.room._id);
            board.refresh();
            toast(`Habitación ${shown.room.number} pasa a aseo`, "warn");
          }}
        />
      )}
      {shown?.kind === "invoice" && <InvoiceModal room={shown.room} stay={shown.stay} result={shown.result} onClose={close} />}
      {shown?.kind === "aseo" && <AseoModal room={shown.room} onClose={close} onDone={() => finishCleaning(shown.room)} />}
      {shown?.kind === "lastInvoice" && <LastInvoice rooms={rooms} onClose={close} />}
    </Page>
  );
}
