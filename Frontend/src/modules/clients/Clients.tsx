import { useDeferredValue, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errMsg, fday, fdate, fmt, initials, nightsBetween, num, plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { createClient, deleteClient, getClients, updateClient } from "../../services/clientService";
import { getReservations } from "../../services/reservationService";
import type { Client } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { Badge, BusyButton, ConfirmHead, Empty, ErrorCard, LoadChip, NoteBox, Pager, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { usePaging } from "../../lib/usePaging";
import { useToast } from "../../ui/Toast";
import { RES_STATUS } from "../reservations/policy";

type ModalState =
  | { kind: "form"; editing: Client | null; seed?: string }
  | { kind: "detail"; id: string }
  | { kind: "delete"; id: string };

/* ---------------- nuevo / editar ---------------- */
function ClientForm({ editing, seed, onClose, onSaved }: { editing: Client | null; seed?: string; onClose: () => void; onSaved: (client: Client, created: boolean) => void }) {
  const [name, setName] = useState(editing?.name ?? seed ?? "");
  const [doc, setDoc] = useState(editing?.document ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [errors, setErrors] = useState<{ name?: string; doc?: string; phone?: string }>({});
  const [serverErr, setServerErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const save = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Escribe el nombre del cliente";
    if (!/^\d{5,20}$/.test(doc.trim())) e.doc = "Solo números, entre 5 y 20 dígitos";
    if (!/^\d{7,15}$/.test(phone.trim())) e.phone = "Solo números, entre 7 y 15 dígitos";
    if (Object.keys(e).length) {
      setErrors(e);
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setServerErr("");
    try {
      const data = { name: name.trim(), document: doc.trim(), phone: phone.trim() };
      onSaved(editing ? await updateClient(editing._id, data) : await createClient(data), !editing);
    } catch (err) {
      setServerErr(errMsg(err, "No se pudo guardar el cliente"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const title = editing ? "Editar cliente" : "Nuevo cliente";
  const clear = (k: keyof typeof errors) => setErrors((x) => ({ ...x, [k]: undefined }));

  return (
    <Overlay kind="drawer" label={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div><div className="overline">clients-service</div><h2>{title}</h2></div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className={"form" + (shake ? (shake % 2 ? " shake-a" : " shake-b") : "")}>
              <div className="fld">
                <label className="lbl" htmlFor="c-name">Nombre completo *</label>
                <input id="c-name" className={"inp" + (errors.name ? " bad" : "")} value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} placeholder="Ej. Laura Méndez" autoComplete="off" />
                {errors.name && <div className="ferr">{errors.name}</div>}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="c-doc">Documento *</label>
                <input id="c-doc" className={"inp" + (errors.doc ? " bad" : "")} inputMode="numeric" value={doc} onChange={(e) => { setDoc(e.target.value); clear("doc"); }} placeholder="Solo números" autoComplete="off" />
                <div className="help">Es único: no pueden existir dos clientes con el mismo documento.</div>
                {errors.doc && <div className="ferr">{errors.doc}</div>}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="c-phone">Teléfono *</label>
                <input id="c-phone" className={"inp" + (errors.phone ? " bad" : "")} type="tel" inputMode="numeric" value={phone} onChange={(e) => { setPhone(e.target.value); clear("phone"); }} placeholder="Solo números" autoComplete="off" />
                {errors.phone && <div className="ferr">{errors.phone}</div>}
              </div>
            </div>
            {serverErr && <NoteBox tone="err" icon="alert">{serverErr}</NoteBox>}
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label={editing ? "Guardar cambios" : "Registrar cliente"} busyLabel="Guardando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- historial ---------------- */
function ClientDetail({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
  // Las reservas se piden solo al abrir el historial (no al listar 8 mil clientes).
  const reservations = useResource(getReservations);
  const mine = (reservations.data ?? [])
    .filter((r) => r.clientDocument === client.document)
    .sort((a, b) => Date.parse(b.checkIn) - Date.parse(a.checkIn));
  const live = mine.filter((r) => r.status !== "cancelled");
  const nights = live.reduce((s, r) => s + nightsBetween(r.checkIn, r.checkOut), 0);
  const spent = live.reduce((s, r) => s + r.totalPrice, 0);

  return (
    <Overlay kind="drawer" label="Historial del cliente" onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div className="person">
              <span className="av lg">{initials(client.name)}</span>
              <div>
                <div className="overline">Cliente</div>
                <h2>{client.name}</h2>
                <div className="muted sm-text">{client.document} · {client.phone}</div>
              </div>
            </div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className="kpis" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <div className="card kpi rise" style={{ "--i": 0, padding: 14 } as CSSProperties}><span className="overline">Reservas</span><span className="amt-lg">{reservations.status === "ready" ? live.length : "—"}</span></div>
              <div className="card kpi rise" style={{ "--i": 1, padding: 14 } as CSSProperties}><span className="overline">Noches</span><span className="amt-lg">{reservations.status === "ready" ? nights : "—"}</span></div>
              <div className="card kpi rise" style={{ "--i": 2, padding: 14 } as CSSProperties}><span className="overline">Ha gastado</span><span className="amt">{reservations.status === "ready" ? fmt(spent) : "—"}</span></div>
            </div>
            <div>
              <h3 className="h3">Historial</h3>
              <div className="list">
                {reservations.status === "loading" && [0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 52, margin: "8px 0" }} />)}
                {reservations.status === "error" && <div className="empty">{reservations.error}</div>}
                {mine.slice(0, 30).map((r, i) => (
                  <div key={r._id} className="li rise" style={{ "--i": Math.min(i, 8) } as CSSProperties}>
                    <span className="ico-t kico t-info"><Icon name="room" /></span>
                    <div className="li-main">
                      <div className="strong">Habitación {r.roomNumber}</div>
                      <div className="muted sm-text">{fdate(r.checkIn)} → {fdate(r.checkOut)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className="amt">{fmt(r.totalPrice)}</span>
                      <Badge tone={RES_STATUS[r.status].tone}>{RES_STATUS[r.status].label}</Badge>
                    </div>
                  </div>
                ))}
                {reservations.status === "ready" && mine.length === 0 && <div className="empty">Todavía no tiene reservas.</div>}
              </div>
            </div>
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={onEdit}>Editar datos</button>
            <Link className="btn primary plus" to="/reservations?vista=nueva"><Icon name="plus" />Nueva reserva</Link>
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- eliminar ---------------- */
function DeleteModal({ client, onClose, onDeleted }: { client: Client; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteClient(client._id);
      onDeleted();
    } catch (e) {
      setErr(errMsg(e, "No se pudo eliminar el cliente"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Eliminar cliente" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead icon="trash" tone="err" title={`¿Eliminar a ${client.name}?`} text="Se borra del directorio de clientes. Las reservas y cuentas ya hechas conservan su nombre." />
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Conservar</button>
            <BusyButton busy={busy} className="btn danger" label="Sí, eliminar" busyLabel="Eliminando…" onClick={confirm} />
          </div>
        </>
      )}
    </Overlay>
  );
}

export default function Clients() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // nuevo | detalle | eliminar | vacio

  const res = useResource(getClients);
  const [q, setQ] = useState(vista === "vacio" ? "zzz sin coincidencias" : "");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const all = res.data ?? [];
  const byId = (id: string) => all.find((c) => c._id === id);

  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  let shown = modal;
  if (!shown && !vistaDone && res.data) {
    if (vista === "nuevo") shown = { kind: "form", editing: null };
    if (vista === "detalle" && all[0]) shown = { kind: "detail", id: all[0]._id };
    if (vista === "eliminar" && all[0]) shown = { kind: "delete", id: all[0]._id };
  }

  const mark = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1900);
  };

  // Con miles de clientes, filtrar en el navegador es instantáneo; pintar todo no: por eso se pagina.
  const rows = query ? all.filter((c) => `${c.name} ${c.document} ${c.phone}`.toLowerCase().includes(query)) : all;
  const paging = usePaging(rows, query);

  const columns: Column<Client>[] = [
    {
      header: "Cliente",
      width: "minmax(240px, 1.4fr)",
      cell: (c) => (
        <button className="linkish person" onClick={() => open({ kind: "detail", id: c._id })} aria-label={`Ver historial de ${c.name}`}>
          <span className="av">{initials(c.name)}</span>
          <span className="pc"><span className="strong" style={{ display: "block" }}>{c.name}</span></span>
        </button>
      ),
    },
    { header: "Documento", width: "150px", cell: (c) => <span className="amt">{c.document}</span> },
    { header: "Teléfono", width: "150px", cell: (c) => c.phone },
    { header: "Registrado", width: "140px", cell: (c) => <span className="sm-text muted">{fday(c.createdAt)}</span> },
    {
      header: "Acciones",
      width: "110px",
      num: true,
      cell: (c) => (
        <div className="acts">
          <button className="icon-btn soft" onClick={() => open({ kind: "form", editing: c })} aria-label={`Editar a ${c.name}`}><Icon name="edit" /></button>
          <button className="icon-btn soft danger" onClick={() => open({ kind: "delete", id: c._id })} aria-label={`Eliminar a ${c.name}`}><Icon name="trash" /></button>
        </div>
      ),
    },
  ];

  const target = shown && shown.kind !== "form" ? byId(shown.id) : undefined;

  return (
    <Page
      title="Clientes"
      service="clients-service"
      subtitle="Las personas que se han hospedado contigo"
      search={{ value: q, onChange: setQ, placeholder: "Nombre, documento o teléfono", label: "Buscar clientes" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null })}>
          <Icon name="plus" />
          Nuevo cliente
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar los clientes" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="bar-row">
            <div className="muted sm-text">{query ? `${num(rows.length)} de ${num(all.length)} clientes` : plural(all.length, "cliente", "clientes")}</div>
            <LoadChip stats={res.stats} records={all.length} noun="clientes" />
          </div>
          <div className={res.refreshing ? "refreshing" : undefined}>
            <Table
              label="Clientes"
              columns={columns}
              rows={paging.slice}
              rowKey={(c) => c._id}
              minWidth={860}
              freshId={fresh}
              loading={res.status === "loading"}
              empty={
                <Empty title={`Nada coincide con “${q.trim()}”`}>
                  <span>Revisa cómo está escrito o registra al cliente ahora.</span>
                  <div className="row-btns" style={{ justifyContent: "center", marginTop: 12 }}>
                    <button className="btn ghost" onClick={() => setQ("")}>Limpiar búsqueda</button>
                    <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null, seed: q.trim() })}><Icon name="plus" />Registrar cliente</button>
                  </div>
                </Empty>
              }
              footer={<Pager paging={paging} noun="clientes" />}
            />
          </div>
        </>
      )}

      {shown?.kind === "form" && (
        <ClientForm
          editing={shown.editing}
          seed={shown.seed}
          onClose={() => open(null)}
          onSaved={(client, created) => {
            mark(client._id);
            res.refresh();
            open(null);
            toast(created ? `${client.name} quedó registrado` : "Datos del cliente actualizados");
          }}
        />
      )}
      {shown?.kind === "detail" && target && (
        <ClientDetail client={target} onClose={() => open(null)} onEdit={() => open({ kind: "form", editing: target })} />
      )}
      {shown?.kind === "delete" && target && (
        <DeleteModal
          client={target}
          onClose={() => open(null)}
          onDeleted={() => {
            res.refresh();
            open(null);
            toast(`${target.name} eliminado`, "mute");
          }}
        />
      )}
    </Page>
  );
}
