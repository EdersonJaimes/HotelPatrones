import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { errMsg, fdate, fmt, initials, num, plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  confirmReservation,
  getReservations,
} from "../../services/reservationService";
import { getRooms } from "../../services/roomService";
import type { Reservation, ReservationStatus } from "../../types/domain";
import Icon from "../../ui/Icon";
import { Badge, Empty, ErrorCard, LoadChip, Pager, Seg, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { usePaging } from "../../lib/usePaging";
import { useToast } from "../../ui/Toast";
import { CancelModal, ReservationDetail, ReservationForm, type DetailAction } from "./ReservationOverlays";
import { CHANNELS, RES_STATUS } from "./policy";

type Filter = "all" | ReservationStatus;

type ModalState =
  | { kind: "form"; editing: Reservation | null; invalid?: boolean }
  | { kind: "detail"; id: string }
  | { kind: "cancel"; id: string };

async function loadPage() {
  const [list, rooms] = await Promise.all([getReservations(), getRooms()]);
  return { list, rooms: rooms.sort((a, b) => a.number - b.number) };
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "checked_in", label: "En casa" },
  { key: "checked_out", label: "Finalizadas" },
  { key: "cancelled", label: "Canceladas" },
];

export default function Reservations() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // nueva | validacion | detalle | cancelar

  const res = useResource(loadPage);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const all = res.data?.list ?? [];
  const rooms = res.data?.rooms ?? [];
  const byId = (id: string) => all.find((r) => r._id === id);

  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  // ?vista=: abre el estado del diseño apenas hay datos (una sola vez).
  let shown = modal;
  if (!shown && !vistaDone && res.data) {
    const actionable = all.find((r) => r.status === "pending" || r.status === "confirmed") ?? all[0];
    if (vista === "nueva") shown = { kind: "form", editing: null };
    if (vista === "validacion") shown = { kind: "form", editing: null, invalid: true };
    if (vista === "detalle" && actionable) shown = { kind: "detail", id: actionable._id };
    if (vista === "cancelar" && actionable) shown = { kind: "cancel", id: actionable._id };
  }

  const mark = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1900);
  };

  const transition = async (r: Reservation, run: (id: string) => Promise<Reservation>, done: string) => {
    try {
      await run(r._id);
      mark(r._id);
      res.refresh();
      toast(done);
      return true;
    } catch (e) {
      toast(errMsg(e, "No se pudo completar la acción"), "err");
      return false;
    }
  };

  const doConfirm = (r: Reservation) => transition(r, confirmReservation, "Reserva confirmada");
  const doCheckIn = (r: Reservation) => transition(r, checkInReservation, `Check-in listo · ${r.clientName} en la ${r.roomNumber}`);
  const doCheckOut = (r: Reservation) => transition(r, checkOutReservation, `Check-out hecho · habitación ${r.roomNumber} a aseo`);

  const doCancel = async (r: Reservation) => {
    const updated = await cancelReservation(r._id);
    const pen = updated.cancellationPenalty ?? 0;
    mark(r._id);
    res.refresh();
    open(null);
    toast(`Reserva cancelada${pen ? ` · penalidad ${fmt(pen)}` : " sin penalidad"}`, "mute");
  };

  const buttons = (r: Reservation, inDrawer: boolean): DetailAction[] => {
    const b: DetailAction[] = [];
    const sm = inDrawer ? "" : " sm";
    if (r.status === "pending") b.push({ label: "Confirmar", cls: `btn${sm} t-info`, run: async () => { if (await doConfirm(r) && inDrawer) open(null); } });
    if (r.status === "confirmed") b.push({ label: "Check-in", cls: `btn${sm} t-ok`, run: async () => { if (await doCheckIn(r) && inDrawer) open(null); } });
    if (r.status === "checked_in" && inDrawer) b.push({ label: "Hacer check-out", cls: "btn t-warn", run: async () => { if (await doCheckOut(r)) open(null); } });
    if (r.status === "checked_in" && !inDrawer) b.push({ label: "Ver detalle", cls: "btn sm ghost", run: () => open({ kind: "detail", id: r._id }) });
    if (inDrawer && r.status === "pending") b.push({ label: "Editar", cls: "btn ghost", run: () => open({ kind: "form", editing: r }) });
    if (r.status === "pending" || r.status === "confirmed") b.push({ label: "Cancelar", cls: `btn${sm} t-err`, run: () => open({ kind: "cancel", id: r._id }) });
    return b;
  };

  const base = all.filter((r) => filter === "all" || r.status === filter);
  const rows = base
    .filter((r) => !query || `${r.clientName} ${r.roomNumber} ${CHANNELS[r.channel].label} ${r.clientDocument ?? ""}`.toLowerCase().includes(query))
    .sort((a, b) => Date.parse(b.checkIn) - Date.parse(a.checkIn));
  const paging = usePaging(rows, `${filter}|${query}`);
  const countOf = (k: Filter) => (k === "all" ? all.length : all.filter((r) => r.status === k).length);

  const columns: Column<Reservation>[] = [
    { header: "Hab.", width: "64px", cell: (r) => <span className="amt">{r.roomNumber}</span> },
    {
      header: "Huésped",
      width: "minmax(220px, 1.4fr)",
      cell: (r) => (
        <button className="linkish person" onClick={() => open({ kind: "detail", id: r._id })} aria-label={`Ver reserva de ${r.clientName}`}>
          <span className="av">{initials(r.clientName)}</span>
          <span className="pc">
            <span className="strong" style={{ display: "block" }}>{r.clientName}</span>
            <span className="muted sm-text">{CHANNELS[r.channel].label} · {plural(r.guests, "persona", "personas")}</span>
          </span>
        </button>
      ),
    },
    { header: "Llegada", width: "120px", cell: (r) => <span className="sm-text">{fdate(r.checkIn)}</span> },
    { header: "Salida", width: "120px", cell: (r) => <span className="sm-text">{fdate(r.checkOut)}</span> },
    { header: "Total", width: "130px", num: true, cell: (r) => <span className="amt">{fmt(r.totalPrice)}</span> },
    { header: "Estado", width: "130px", cell: (r) => <Badge tone={RES_STATUS[r.status].tone}>{RES_STATUS[r.status].label}</Badge> },
    {
      header: "Acciones",
      width: "minmax(220px, 1fr)",
      num: true,
      cell: (r) => {
        const b = buttons(r, false);
        return (
          <div className="acts">
            {b.map((x) => <button key={x.label} className={x.cls} onClick={x.run}>{x.label}</button>)}
            {b.length === 0 && <span className="muted">—</span>}
          </div>
        );
      },
    },
  ];

  const detail = shown?.kind === "detail" ? byId(shown.id) : undefined;
  const cancelling = shown?.kind === "cancel" ? byId(shown.id) : undefined;

  return (
    <Page
      title="Reservas"
      service="reservations-service"
      subtitle="Del primer contacto al check-out"
      search={{ value: q, onChange: setQ, placeholder: "Huésped, documento o habitación", label: "Buscar reservas" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null })}>
          <Icon name="plus" />
          Nueva reserva
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar las reservas" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="bar-row">
            <Seg<Filter> label="Filtrar reservas" value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ ...f, count: countOf(f.key) }))} />
            <div className="row-btns" style={{ alignItems: "center" }}>
              <span className="muted sm-text">
                {query ? `${num(rows.length)} de ${num(base.length)} reservas` : plural(base.length, "reserva", "reservas")}
              </span>
              <LoadChip stats={res.stats} records={all.length} noun="reservas" />
            </div>
          </div>

          <div className={res.refreshing ? "refreshing" : undefined}>
            <Table
              label="Reservas"
              columns={columns}
              rows={paging.slice}
              rowKey={(r) => r._id}
              minWidth={1120}
              freshId={fresh}
              loading={res.status === "loading"}
              empty={<Empty icon="calendar" title={query ? `Nada coincide con “${q.trim()}”.` : "No hay reservas en este estado."} />}
              footer={<Pager paging={paging} noun="reservas" />}
            />
          </div>
        </>
      )}

      {shown?.kind === "form" && (
        <ReservationForm
          rooms={rooms}
          editing={shown.editing}
          invalid={shown.invalid}
          onClose={() => open(null)}
          onSaved={(saved, created) => {
            mark(saved._id);
            res.refresh();
            open(null);
            if (created) setFilter("all");
            toast(created ? `Reserva creada para ${saved.clientName} · ${fmt(saved.totalPrice)}` : "Reserva actualizada");
          }}
        />
      )}
      {detail && <ReservationDetail reservation={detail} actions={buttons(detail, true)} onClose={() => open(null)} />}
      {cancelling && <CancelModal reservation={cancelling} onClose={() => open(null)} onConfirm={() => doCancel(cancelling)} />}
    </Page>
  );
}
