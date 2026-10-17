import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { errMsg, fmt, num, plural } from "../../lib/format";
import { ROOM_CAP, ROOM_STATUS, ROOM_TYPE } from "../../lib/stay";
import { useResource } from "../../lib/useResource";
import { createRoomFromPrototype, deleteRoom, getPrototypes, getRooms, setRoomStatus, updateRoom } from "../../services/roomService";
import type { Room, RoomPrototype, RoomStatus, RoomType } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { Badge, BusyButton, ConfirmHead, Empty, ErrorCard, LoadChip, ModalHead, NoteBox, Opts, Pager, Seg, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { usePaging } from "../../lib/usePaging";
import { useToast } from "../../ui/Toast";

const AMENITIES = ["Aire acondicionado", "Ventilador", "TV", "Wifi", "Minibar", "Jacuzzi", "Balcón", "Caja fuerte"];
const TYPES: RoomType[] = ["individual", "doble", "triple", "suite"];

type Filter = "all" | RoomStatus;

type ModalState =
  | { kind: "form"; editing: Room | null }
  | { kind: "status"; id: string }
  | { kind: "delete"; id: string };

async function loadPage() {
  const [rooms, prototypes] = await Promise.all([getRooms(), getPrototypes()]);
  return { rooms: rooms.sort((a, b) => a.number - b.number), prototypes };
}

/* ---------------- crear (desde plantilla) / editar ---------------- */
function RoomForm({
  editing,
  prototypes,
  suggestedNumber,
  onClose,
  onSaved,
}: {
  editing: Room | null;
  prototypes: RoomPrototype[];
  suggestedNumber: number;
  onClose: () => void;
  onSaved: (room: Room, created: boolean) => void;
}) {
  const [type, setType] = useState<RoomType>(editing?.type ?? "doble");
  const proto = prototypes.find((p) => p.type === type);
  const [number, setNumber] = useState(editing ? String(editing.number) : String(suggestedNumber));
  const [price, setPrice] = useState<string | null>(editing ? String(editing.price) : null);
  const [status, setStatus] = useState<RoomStatus>(editing?.status ?? "available");
  const [amenities, setAmenities] = useState<string[] | null>(editing ? editing.amenities : null);
  const [errors, setErrors] = useState<{ number?: string; price?: string }>({});
  const [serverErr, setServerErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  // Al elegir plantilla, la habitación nueva copia su tarifa y comodidades hasta que se editen.
  const priceValue = price ?? String(proto?.price ?? "");
  const amenValue = amenities ?? proto?.amenities ?? [];
  const range = proto ? `${fmt(proto.minPrice)} – ${fmt(proto.maxPrice)}` : "";

  const toggle = (a: string) => setAmenities(amenValue.includes(a) ? amenValue.filter((x) => x !== a) : [...amenValue, a]);

  const save = async () => {
    const e: typeof errors = {};
    const n = Number(number);
    const p = Number(priceValue);
    if (!number || !Number.isInteger(n) || n < 1) e.number = "Escribe un número de habitación válido";
    if (!priceValue || isNaN(p)) e.price = "Escribe la tarifa por noche";
    else if (proto && (p < proto.minPrice || p > proto.maxPrice)) e.price = `Para este tipo debe estar entre ${range}`;
    if (Object.keys(e).length) {
      setErrors(e);
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    setServerErr("");
    try {
      const saved = editing
        ? await updateRoom(editing._id, { number: n, price: p, status, amenities: amenValue })
        : await createRoomFromPrototype(type, { number: n, price: p, status, amenities: amenValue });
      onSaved(saved, !editing);
    } catch (err) {
      setServerErr(errMsg(err, "No se pudo guardar la habitación"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const title = editing ? `Editar habitación ${editing.number}` : "Nueva habitación";

  return (
    <Overlay kind="drawer" label={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div><div className="overline">rooms-service</div><h2>{title}</h2></div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            {!editing && (
              <div className="fld">
                <span className="lbl">1. Elige una plantilla</span>
                <div className="proto" role="group" aria-label="Plantillas de habitación">
                  {TYPES.map((t) => {
                    const p = prototypes.find((x) => x.type === t);
                    return (
                      <button
                        key={t}
                        className={"proto-c" + (type === t ? " on" : "")}
                        aria-pressed={type === t}
                        onClick={() => {
                          setType(t);
                          setPrice(null);
                          setAmenities(null);
                        }}
                      >
                        <span className="strong">{ROOM_TYPE[t]}</span>
                        <span className="amt">{p ? fmt(p.price) : "—"}</span>
                        <span className="muted sm-text">{plural(p?.capacity ?? ROOM_CAP[t], "persona", "personas")} · {p?.amenities?.length ?? 0} comodidades</span>
                      </button>
                    );
                  })}
                </div>
                <div className="help">La habitación nueva copia la tarifa, capacidad y comodidades de la plantilla. Después ajustas lo que cambie.</div>
              </div>
            )}
            {!editing && <div className="lbl">2. Ajusta los datos</div>}
            {editing && (
              <div className="sum-box">
                <div><div className="muted sm-text">Tipo</div><div className="strong">{ROOM_TYPE[editing.type]}</div></div>
                <div style={{ textAlign: "right" }}><div className="muted sm-text">Rango de tarifa</div><div className="strong">{range}</div></div>
              </div>
            )}
            <div className={"form" + (shake ? (shake % 2 ? " shake-a" : " shake-b") : "")}>
              <div className="fld half">
                <label className="lbl" htmlFor="h-n">Número *</label>
                <input id="h-n" className={"inp" + (errors.number ? " bad" : "")} type="number" value={number} onChange={(e) => { setNumber(e.target.value); setErrors((x) => ({ ...x, number: undefined })); }} placeholder="Ej. 305" />
                {errors.number && <div className="ferr">{errors.number}</div>}
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="h-p">Tarifa por noche *</label>
                <input id="h-p" className={"inp" + (errors.price ? " bad" : "")} type="number" value={priceValue} onChange={(e) => { setPrice(e.target.value); setErrors((x) => ({ ...x, price: undefined })); }} />
                <div className="help">Rango permitido: {range}</div>
                {errors.price && <div className="ferr">{errors.price}</div>}
              </div>
              <div className="fld">
                <span className="lbl">Estado {editing ? "" : "inicial"}</span>
                <Opts<RoomStatus>
                  label="Estado"
                  value={status}
                  onPick={setStatus}
                  options={(editing ? (["available", "occupied", "cleaning", "maintenance"] as RoomStatus[]) : (["available", "maintenance"] as RoomStatus[])).map((s) => ({ value: s, label: ROOM_STATUS[s].label }))}
                />
              </div>
              <div className="fld">
                <span className="lbl">Comodidades</span>
                <Opts<string> label="Comodidades" value={amenValue} onPick={toggle} options={AMENITIES.map((a) => ({ value: a, label: a }))} />
              </div>
            </div>
            {serverErr && <NoteBox tone="err" icon="alert">{serverErr}</NoteBox>}
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label={editing ? "Guardar cambios" : "Crear habitación"} busyLabel="Guardando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- cambiar estado ---------------- */
const STATUS_HELP: Record<RoomStatus, string> = {
  available: "Lista para un nuevo check-in",
  occupied: "Se asigna al hacer check-in en Recepción",
  cleaning: "Aseo en curso",
  maintenance: "Fuera de servicio por revisión técnica",
};

function StatusModal({ room, onClose, onSaved }: { room: Room; onClose: () => void; onSaved: (room: Room) => void }) {
  const [next, setNext] = useState<RoomStatus>(room.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      onSaved(await setRoomStatus(room._id, next));
    } catch (e) {
      setErr(errMsg(e, "No se pudo cambiar el estado"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Cambiar estado" onClose={onClose}>
      {(close) => (
        <>
          <ModalHead overline={`Habitación ${room.number}`} title="Cambiar estado" onClose={close} />
          <div className="list" role="group" aria-label="Estados">
            {(["available", "occupied", "cleaning", "maintenance"] as RoomStatus[]).map((s) => (
              <button
                key={s}
                className={"proto-c" + (next === s ? " on" : "")}
                aria-pressed={next === s}
                disabled={s === "occupied" && room.status !== "occupied"}
                onClick={() => setNext(s)}
                style={{ width: "100%", flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}
              >
                <Badge tone={ROOM_STATUS[s].tone}>{ROOM_STATUS[s].label}</Badge>
                <span className="muted sm-text" style={{ flex: 1 }}>{STATUS_HELP[s]}</span>
              </button>
            ))}
          </div>
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label="Guardar estado" busyLabel="Guardando…" onClick={confirm} disabled={next === room.status} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- eliminar ---------------- */
function DeleteModal({ room, onClose, onDeleted }: { room: Room; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blocked = room.status === "occupied";

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteRoom(room._id);
      onDeleted();
    } catch (e) {
      setErr(errMsg(e, "No se pudo eliminar la habitación"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Eliminar habitación" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead icon="trash" tone="err" title={`¿Eliminar la habitación ${room.number}?`} text="Deja de aparecer en Recepción y no se podrá reservar. Las reservas ya hechas se conservan." />
          {blocked && <NoteBox tone="warn" icon="alert">Tiene huéspedes ahora. Haz el check-out antes de eliminarla.</NoteBox>}
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Conservar</button>
            <BusyButton busy={busy} className="btn danger" label="Sí, eliminar" busyLabel="Eliminando…" onClick={confirm} disabled={blocked} />
          </div>
        </>
      )}
    </Overlay>
  );
}

export default function Rooms() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // nueva | editar | estado | eliminar

  const res = useResource(loadPage);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const all = res.data?.rooms ?? [];
  const prototypes = res.data?.prototypes ?? [];
  const byId = (id: string) => all.find((r) => r._id === id);

  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  let shown = modal;
  if (!shown && !vistaDone && res.data && all.length) {
    const target = all.find((r) => r.status !== "occupied") ?? all[0];
    if (vista === "nueva") shown = { kind: "form", editing: null };
    if (vista === "editar") shown = { kind: "form", editing: target };
    if (vista === "estado") shown = { kind: "status", id: target._id };
    if (vista === "eliminar") shown = { kind: "delete", id: (all.find((r) => r.status === "occupied") ?? target)._id };
  }

  const mark = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1900);
  };

  const base = all.filter((r) => filter === "all" || r.status === filter);
  const rows = base.filter((r) => !query || `${r.number} ${ROOM_TYPE[r.type]} ${(r.amenities ?? []).join(" ")}`.toLowerCase().includes(query));
  const paging = usePaging(rows, `${filter}|${query}`);
  const countOf = (s: Filter) => (s === "all" ? all.length : all.filter((r) => r.status === s).length);
  const nextNumber = all.length ? Math.max(...all.map((r) => r.number)) + 1 : 101;

  const columns: Column<Room>[] = [
    { header: "Habitación", width: "120px", cell: (r) => <span className="amt">Hab. {r.number}</span> },
    { header: "Tipo", width: "110px", cell: (r) => ROOM_TYPE[r.type] },
    { header: "Capacidad", width: "120px", cell: (r) => plural(r.capacity ?? ROOM_CAP[r.type], "persona", "personas") },
    { header: "Tarifa / noche", width: "140px", num: true, cell: (r) => <span className="amt">{fmt(r.price)}</span> },
    {
      header: "Estado",
      width: "150px",
      cell: (r) => (
        <button className="linkish" onClick={() => open({ kind: "status", id: r._id })} aria-label={`Cambiar estado de la habitación ${r.number}`}>
          <Badge tone={ROOM_STATUS[r.status].tone}>{ROOM_STATUS[r.status].label}</Badge>
        </button>
      ),
    },
    {
      header: "Comodidades",
      width: "minmax(220px, 1fr)",
      cell: (r) => <div className="chips">{(r.amenities ?? []).slice(0, 4).map((a) => <span key={a} className="chip-s">{a}</span>)}{(r.amenities?.length ?? 0) > 4 && <span className="chip-s">+{r.amenities.length - 4}</span>}</div>,
    },
    {
      header: "Acciones",
      width: "110px",
      num: true,
      cell: (r) => (
        <div className="acts">
          <button className="icon-btn soft" onClick={() => open({ kind: "form", editing: r })} aria-label={`Editar habitación ${r.number}`}><Icon name="edit" /></button>
          <button className="icon-btn soft danger" onClick={() => open({ kind: "delete", id: r._id })} aria-label={`Eliminar habitación ${r.number}`}><Icon name="trash" /></button>
        </div>
      ),
    },
  ];

  const target = shown && (shown.kind === "status" || shown.kind === "delete") ? byId(shown.id) : undefined;

  return (
    <Page
      title="Habitaciones"
      service="rooms-service"
      subtitle="Tipos, tarifas, comodidades y estado"
      search={{ value: q, onChange: setQ, placeholder: "Número, tipo o comodidad", label: "Buscar habitaciones" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null })}>
          <Icon name="plus" />
          Nueva habitación
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar las habitaciones" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="bar-row">
            <Seg<Filter>
              label="Filtrar habitaciones"
              value={filter}
              onChange={setFilter}
              items={[
                { key: "all", label: "Todas", count: countOf("all") },
                { key: "available", label: "Disponibles", count: countOf("available") },
                { key: "occupied", label: "Ocupadas", count: countOf("occupied") },
                { key: "cleaning", label: "En aseo", count: countOf("cleaning") },
                { key: "maintenance", label: "Mantenimiento", count: countOf("maintenance") },
              ]}
            />
            <div className="row-btns" style={{ alignItems: "center" }}>
              <span className="muted sm-text">{query ? `${num(rows.length)} de ${num(base.length)} habitaciones` : plural(base.length, "habitación", "habitaciones")}</span>
              <LoadChip stats={res.stats} records={all.length} noun="habitaciones" />
            </div>
          </div>
          <div className={res.refreshing ? "refreshing" : undefined}>
            <Table
              label="Habitaciones"
              columns={columns}
              rows={paging.slice}
              rowKey={(r) => r._id}
              minWidth={1060}
              freshId={fresh}
              loading={res.status === "loading"}
              empty={<Empty icon="room" title={query ? `Nada coincide con “${q.trim()}”.` : "No hay habitaciones en este estado."} />}
              footer={<Pager paging={paging} noun="habitaciones" />}
            />
          </div>
        </>
      )}

      {shown?.kind === "form" && (
        <RoomForm
          editing={shown.editing}
          prototypes={prototypes}
          suggestedNumber={nextNumber}
          onClose={() => open(null)}
          onSaved={(room, created) => {
            mark(room._id);
            res.refresh();
            open(null);
            toast(created ? `Habitación ${room.number} creada desde la plantilla ${ROOM_TYPE[room.type].toLowerCase()}` : `Habitación ${room.number} actualizada`);
          }}
        />
      )}
      {shown?.kind === "status" && target && (
        <StatusModal
          room={target}
          onClose={() => open(null)}
          onSaved={(room) => {
            mark(room._id);
            res.refresh();
            open(null);
            toast(`Habitación ${room.number}: ${ROOM_STATUS[room.status].label.toLowerCase()}`);
          }}
        />
      )}
      {shown?.kind === "delete" && target && (
        <DeleteModal
          room={target}
          onClose={() => open(null)}
          onDeleted={() => {
            res.refresh();
            open(null);
            toast(`Habitación ${target.number} eliminada`, "mute");
          }}
        />
      )}
    </Page>
  );
}
