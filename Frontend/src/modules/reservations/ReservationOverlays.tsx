import { useState, type CSSProperties } from "react";
import { errMsg, fdate, fmt, initials, nightsBetween, plural, toLocalInput } from "../../lib/format";
import { ROOM_TYPE } from "../../lib/stay";
import { createReservation, updateReservation } from "../../services/reservationService";
import type { Reservation, ReservationChannel, Room } from "../../types/domain";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { Badge, BusyButton, ConfirmHead, NoteBox, Opts } from "../../ui/parts";
import { CHANNEL_KEYS, CHANNELS, penaltyNow, policyNote, policyText, RES_STATUS } from "./policy";

/* ---------------- formulario (nueva / editar) ---------------- */
interface FormState {
  room: string;
  name: string;
  doc: string;
  phone: string;
  ci: string;
  co: string;
  guests: string;
  channel: ReservationChannel;
  notes: string;
}

function defaults(rooms: Room[]): FormState {
  const at = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return toLocalInput(d);
  };
  return {
    room: rooms.find((r) => r.status !== "maintenance")?._id ?? "",
    name: "",
    doc: "",
    phone: "",
    ci: at(1, 15),
    co: at(3, 12),
    guests: "2",
    channel: "phone",
    notes: "",
  };
}

export function ReservationForm({
  rooms,
  editing,
  invalid,
  onClose,
  onSaved,
}: {
  rooms: Room[];
  editing: Reservation | null;
  invalid?: boolean; // ?vista=validacion: arranca con los errores del diseño
  onClose: () => void;
  onSaved: (reservation: Reservation, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (editing) {
      return {
        room: editing.roomId,
        name: editing.clientName,
        doc: editing.clientDocument ?? "",
        phone: editing.clientPhone ?? "",
        ci: toLocalInput(editing.checkIn),
        co: toLocalInput(editing.checkOut),
        guests: String(editing.guests),
        channel: editing.channel,
        notes: editing.notes ?? "",
      };
    }
    const base = defaults(rooms);
    // Estado "validación" del diseño: sin nombre y con la salida antes de la llegada.
    return invalid ? { ...base, co: toLocalInput(new Date(Date.parse(base.ci) - 3_600_000)) } : base;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    invalid ? { name: "Escribe el nombre del huésped", co: "La salida debe ser después de la llegada" } : {}
  );
  const [shake, setShake] = useState(invalid ? 1 : 0);
  const [bump, setBump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, ...(key === "ci" || key === "co" ? { co: undefined } : {}) }));
    setBump((b) => b + 1);
  };

  const room = rooms.find((r) => r._id === form.room);
  const channel = CHANNELS[form.channel];
  const nights = Date.parse(form.co) > Date.parse(form.ci) ? nightsBetween(form.ci, form.co) : 0;
  const total = room && nights ? room.price * nights * channel.rate : 0;

  const save = async () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.room) e.room = "Elige una habitación";
    if (!form.name.trim()) e.name = "Escribe el nombre del huésped";
    if (!form.ci) e.ci = "Indica la llegada";
    if (!form.co) e.co = "Indica la salida";
    else if (form.ci && Date.parse(form.co) <= Date.parse(form.ci)) e.co = "La salida debe ser después de la llegada";
    const guests = Number(form.guests);
    if (!guests || guests < 1) e.guests = "Debe haber al menos un huésped";
    else if (room && guests > room.capacity) e.guests = `Esta habitación recibe máximo ${plural(room.capacity, "persona", "personas")}`;
    if (Object.keys(e).length) {
      setErrors(e);
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    setServerErr("");
    try {
      const common = {
        clientName: form.name.trim(),
        clientDocument: form.doc.trim() || undefined,
        clientPhone: form.phone.trim() || undefined,
        checkIn: new Date(form.ci).toISOString(),
        checkOut: new Date(form.co).toISOString(),
        guests,
        notes: form.notes.trim() || undefined,
      };
      const saved = editing
        ? await updateReservation(editing._id, common)
        : await createReservation({ ...common, roomId: form.room, channel: form.channel });
      onSaved(saved, !editing);
    } catch (err) {
      setServerErr(errMsg(err, "No se pudo guardar la reserva"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const title = editing ? "Editar reserva" : "Nueva reserva";
  const field = (k: keyof FormState) => "inp" + (errors[k] ? " bad" : "");
  const err = (k: keyof FormState) => errors[k] && <div className="ferr">{errors[k]}</div>;

  return (
    <Overlay kind="drawer" label={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div><div className="overline">reservations-service</div><h2>{title}</h2></div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className={"form" + (shake ? (shake % 2 ? " shake-a" : " shake-b") : "")}>
              <div className="fld">
                <label className="lbl" htmlFor="r-room">Habitación *</label>
                <select id="r-room" className={field("room")} value={form.room} disabled={!!editing} onChange={(e) => set("room", e.target.value)}>
                  {rooms.filter((r) => r.status !== "maintenance" || r._id === form.room).map((r) => (
                    <option key={r._id} value={r._id}>{r.number} · {ROOM_TYPE[r.type]} · {fmt(r.price)}</option>
                  ))}
                </select>
                <div className="help">{editing ? "La habitación no se cambia: cancela y crea otra reserva." : "Las habitaciones en mantenimiento no aparecen."}</div>
                {err("room")}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="r-name">Cliente *</label>
                <input id="r-name" className={field("name")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre completo" autoComplete="off" />
                {err("name")}
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="r-doc">Documento</label>
                <input id="r-doc" className="inp" inputMode="numeric" value={form.doc} onChange={(e) => set("doc", e.target.value)} autoComplete="off" />
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="r-phone">Teléfono</label>
                <input id="r-phone" className="inp" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" />
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="r-ci">Llegada *</label>
                <input id="r-ci" className={field("ci")} type="datetime-local" value={form.ci} onChange={(e) => set("ci", e.target.value)} />
                {err("ci")}
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="r-co">Salida *</label>
                <input id="r-co" className={field("co")} type="datetime-local" value={form.co} onChange={(e) => set("co", e.target.value)} />
                {err("co")}
              </div>
              <div className="fld half">
                <label className="lbl" htmlFor="r-guests">Huéspedes</label>
                <input id="r-guests" className={field("guests")} type="number" min={1} value={form.guests} onChange={(e) => set("guests", e.target.value)} />
                {err("guests")}
              </div>
              <div className="fld">
                <span className="lbl">Canal</span>
                {editing ? (
                  <div className="chip">{channel.label}</div>
                ) : (
                  <Opts<ReservationChannel> label="Canal" value={form.channel} onPick={(v) => set("channel", v)} options={CHANNEL_KEYS.map((k) => ({ value: k, label: CHANNELS[k].label }))} />
                )}
                <div className="help">El canal define la tarifa, la política de cancelación y la notificación.</div>
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="r-notes">Notas</label>
                <input id="r-notes" className="inp" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ej. llega tarde, pide cuna" autoComplete="off" />
              </div>
            </div>
            <div className="sum-box">
              <div>
                <div className="strong">Total estimado · {channel.label}</div>
                <div className="muted sm-text">
                  {room && nights ? `${fmt(room.price)} × ${plural(nights, "noche", "noches")}${channel.rateText}` : "Elige habitación y fechas válidas"}
                </div>
              </div>
              <span className={"amt-lg " + (bump % 2 ? "bumpA" : "bumpB")}>{total ? fmt(total) : "—"}</span>
            </div>
            <NoteBox tone="info">{policyText(form.channel)}</NoteBox>
            {serverErr && <NoteBox tone="err" icon="alert">{serverErr}</NoteBox>}
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label={editing ? "Guardar cambios" : "Crear reserva"} busyLabel="Guardando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- detalle ---------------- */
export interface DetailAction {
  label: string;
  cls: string;
  run: () => void;
}

export function ReservationDetail({ reservation: r, actions, onClose }: { reservation: Reservation; actions: DetailAction[]; onClose: () => void }) {
  const st = RES_STATUS[r.status];
  const order = ["pending", "confirmed", "checked_in", "checked_out"];
  const pos = r.status === "cancelled" ? 1 : order.indexOf(r.status) + 1;
  const n = nightsBetween(r.checkIn, r.checkOut);
  const note = policyNote(r);

  return (
    <Overlay kind="drawer" label="Detalle de la reserva" onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div className="person">
              <span className="av lg">{initials(r.clientName)}</span>
              <div>
                <div className="overline">Reserva · {CHANNELS[r.channel].label}</div>
                <h2>{r.clientName}</h2>
                <Badge tone={st.tone}>{st.label}</Badge>
              </div>
            </div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className="tl" aria-label="Progreso de la reserva">
              {["Creada", "Confirmada", "Check-in", "Check-out"].map((label, i) => (
                <div key={label} className={"tl-step" + (i < pos ? " done" : "") + (r.status === "cancelled" ? " cancel" : "")}>
                  <div className="tl-bar">{i < pos && <div className="tl-fill" style={{ "--i": i } as CSSProperties} />}</div>
                  {r.status === "cancelled" && i === 1 ? "Cancelada" : label}
                </div>
              ))}
            </div>
            <div className="kv">
              <div><div className="k">Habitación</div><div className="v">Habitación {r.roomNumber}</div></div>
              <div><div className="k">Huéspedes</div><div className="v">{plural(r.guests, "persona", "personas")}</div></div>
              <div><div className="k">Llegada</div><div className="v">{fdate(r.checkIn)}</div></div>
              <div><div className="k">Salida</div><div className="v">{fdate(r.checkOut)}</div></div>
              <div><div className="k">Noches</div><div className="v">{plural(n, "noche", "noches")}</div></div>
              <div><div className="k">Documento · teléfono</div><div className="v">{[r.clientDocument || "Sin documento", r.clientPhone || "sin teléfono"].join(" · ")}</div></div>
              <div className="full"><div className="k">Notas</div><div className="v">{r.notes || "Sin notas"}</div></div>
            </div>
            <div className="sum-box">
              <div>
                <div className="strong">Total de la estadía</div>
                <div className="muted sm-text">{fmt(r.basePrice)} × {plural(n, "noche", "noches")}{CHANNELS[r.channel].rateText}</div>
              </div>
              <span className="amt-lg">{fmt(r.totalPrice)}</span>
            </div>
            <NoteBox tone={note.tone} icon="clock">{note.text}</NoteBox>
          </div>
          <div className="dw-foot">
            {actions.map((a) => (
              <button key={a.label} className={a.cls} onClick={a.run}>{a.label}</button>
            ))}
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- cancelar con penalidad ---------------- */
export function CancelModal({ reservation: r, onClose, onConfirm }: { reservation: Reservation; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const penalty = penaltyNow(r);
  const note = policyNote(r);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setErr(errMsg(e, "No se pudo cancelar la reserva"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Cancelar reserva" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead icon="calendarX" tone="err" title={`¿Cancelar la reserva de ${r.clientName}?`} text={`Habitación ${r.roomNumber} · ${fdate(r.checkIn)} → ${fdate(r.checkOut)}`} />
          <NoteBox tone={note.tone} icon="clock">{note.text}</NoteBox>
          <div className="tots">
            <div className="tot"><span className="muted">Total de la reserva</span><span className="amt">{fmt(r.totalPrice)}</span></div>
            <div className="tot grand"><span className="strong">Penalidad a cobrar</span><span className={"amt-lg" + (penalty ? " tone-err" : "")}>{fmt(penalty)}</span></div>
          </div>
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Volver</button>
            <BusyButton busy={busy} className="btn danger" label="Sí, cancelar" busyLabel="Cancelando…" onClick={confirm} />
          </div>
        </>
      )}
    </Overlay>
  );
}
