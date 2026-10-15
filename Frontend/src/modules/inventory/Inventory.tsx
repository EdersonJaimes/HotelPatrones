import { useDeferredValue, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { errMsg, fdate, kb, num, plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { addStock, getInventory, getMovements, getRecentMovements, removeStock } from "../../services/inventoryService";
import { getProducts } from "../../services/productService";
import { LOW_STOCK, type InventoryMovement, type ProductCategory } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { Badge, BusyButton, Empty, ErrorCard, LoadChip, NoteBox, Opts, Pager, Seg, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { usePaging } from "../../lib/usePaging";
import { useToast } from "../../ui/Toast";
import { CAT_ICON } from "../products/catalog";
import { StockBar } from "../products/Products";

interface Row {
  id: string;
  name: string;
  stock: number;
  category: ProductCategory;
}

type View = "stock" | "kardex";
type StockFilter = "all" | "low" | "out";
type MoveType = "IN" | "OUT";

type ModalState =
  | { kind: "move"; type: MoveType; productId?: string; preset?: boolean }
  | { kind: "history"; id: string };

async function loadStock(): Promise<Row[]> {
  const [inventory, products] = await Promise.all([getInventory(), getProducts()]);
  const category = new Map(products.map((p) => [p._id, p.category]));
  return inventory.map((r) => ({ id: r.product._id, name: r.product.name, stock: r.stock, category: category.get(r.product._id) ?? "General" }));
}

const statusOf = (stock: number) =>
  stock === 0 ? { tone: "err" as const, label: "Agotado" } : stock <= LOW_STOCK ? { tone: "warn" as const, label: "Por reponer" } : { tone: "ok" as const, label: "En orden" };

const REASONS: Record<MoveType, string[]> = {
  IN: ["Compra a proveedor", "Reposición semanal", "Ajuste de inventario"],
  OUT: ["Consumo en habitación", "Producto dañado", "Ajuste de inventario"],
};

/* ---------------- registrar movimiento ---------------- */
function MoveModal({
  rows,
  initialType,
  initialProductId,
  preset,
  onClose,
  onSaved,
}: {
  rows: Row[];
  initialType: MoveType;
  initialProductId?: string;
  preset?: boolean;
  onClose: () => void;
  onSaved: (type: MoveType, row: Row, qty: number) => void;
}) {
  // ?vista=salida: producto con menos existencias y una unidad de más (el caso "sin stock").
  const lowest = preset ? [...rows].sort((a, b) => a.stock - b.stock)[0] : undefined;
  const [type, setType] = useState<MoveType>(initialType);
  const [productId, setProductId] = useState(initialProductId ?? lowest?.id ?? "");
  const [qty, setQty] = useState(lowest ? lowest.stock + 1 : 1);
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState(lowest ? `Stock insuficiente: disponible ${lowest.stock}, solicitado ${lowest.stock + 1}` : "");
  const [reasonErr, setReasonErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const row = rows.find((r) => r.id === productId);
  const query = search.trim().toLowerCase();
  const matches = rows.filter((r) => !query || r.name.toLowerCase().includes(query)).slice(0, 8);
  const tiles = row && !matches.some((m) => m.id === row.id) ? [row, ...matches.slice(0, 7)] : matches;
  const after = row ? (type === "IN" ? row.stock + qty : row.stock - qty) : 0;

  const save = async () => {
    if (!row) return setErr("Elige un producto de la lista.");
    if (!reason.trim()) {
      setReasonErr("Escribe o elige el motivo");
      setShake((s) => s + 1);
      return;
    }
    if (type === "OUT" && qty > row.stock) {
      setErr(`Stock insuficiente: disponible ${row.stock}, solicitado ${qty}`);
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const data = { productId: row.id, quantity: qty, reason: reason.trim() };
      await (type === "IN" ? addStock(data) : removeStock(data));
      onSaved(type, row, qty);
    } catch (e) {
      setErr(errMsg(e, "No se pudo registrar el movimiento"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  return (
    <Overlay label="Registrar movimiento" onClose={onClose} shake={shake > 0 && shake % 2 === 1}>
      {(close) => (
        <>
          <div className="m-head">
            <div><div className="overline">products-service · kardex</div><h2>Registrar movimiento</h2></div>
            <CloseButton onClick={close} />
          </div>
          <Seg<MoveType>
            label="Tipo de movimiento"
            full
            value={type}
            onChange={(t) => { setType(t); setErr(""); }}
            items={[{ key: "IN", label: "↗ Entrada" }, { key: "OUT", label: "↘ Salida" }]}
          />
          <div className="fld">
            <span className="lbl">Producto</span>
            <label className="pick-search">
              <Icon name="search" />
              <span className="sr">Buscar producto</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar entre ${num(rows.length)} productos`} />
            </label>
            <div className="pick" role="group" aria-label="Producto">
              {tiles.map((r) => (
                <button key={r.id} className={"ptile" + (r.id === productId ? " on" : "")} aria-pressed={r.id === productId} onClick={() => { setProductId(r.id); setErr(""); }}>
                  <span className="strong">{r.name}</span>
                  <span className="muted sm-text">{r.stock} en bodega</span>
                </button>
              ))}
              {tiles.length === 0 && <span className="muted sm-text">Ningún producto coincide.</span>}
            </div>
          </div>
          <div className="form">
            <div className="fld half">
              <label className="lbl" htmlFor="i-qty">Cantidad</label>
              <input id="i-qty" className="inp" type="number" min={1} value={qty} onChange={(e) => { setQty(Math.max(1, Math.floor(Number(e.target.value) || 1))); setErr(""); }} />
            </div>
            <div className="fld half">
              <span className="lbl">Stock resultante</span>
              <div className="sum-box" style={{ padding: "10px 14px" }}>
                <span className="amt">{row ? row.stock : "—"}</span>
                <Icon name="arrow" />
                <span className={"amt" + (row && after < 0 ? " tone-err" : "")}>{row ? after : "—"}</span>
              </div>
            </div>
            <div className="fld">
              <label className="lbl" htmlFor="i-reason">Motivo *</label>
              <input id="i-reason" className={"inp" + (reasonErr ? " bad" : "")} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(""); }} placeholder="Escribe o elige uno" autoComplete="off" />
              <Opts<string> label="Motivos frecuentes" value={reason} onPick={(r) => { setReason(r); setReasonErr(""); }} options={REASONS[type].map((r) => ({ value: r, label: r }))} />
              {reasonErr && <div className="ferr">{reasonErr}</div>}
            </div>
          </div>
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label="Registrar movimiento" busyLabel="Registrando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- historial de un producto ---------------- */
function HistoryDrawer({ row, onClose, onMove }: { row: Row; onClose: () => void; onMove: (type: MoveType) => void }) {
  const load = useMemo(() => () => getMovements(row.id), [row.id]);
  const res = useResource(load);
  const st = statusOf(row.stock);
  const cat = CAT_ICON[row.category] ?? CAT_ICON.General;

  // Saldo después de cada movimiento: se parte del stock actual y se retrocede por los más nuevos.
  const recent = (res.data ?? []).slice(0, 100);
  const lines = recent.map((m, i) => ({
    m,
    bal: row.stock - recent.slice(0, i).reduce((sum, x) => sum + (x.type === "IN" ? x.quantity : -x.quantity), 0),
  }));

  return (
    <Overlay kind="drawer" label="Historial del producto" onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div className="person">
              <span className={`pico ${cat.color}`}><Icon name={cat.icon} /></span>
              <div><div className="overline">Kardex · {row.category}</div><h2>{row.name}</h2></div>
            </div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className="sum-box">
              <div><div className="muted sm-text">Stock actual</div><div className="amt-xl">{num(row.stock)}</div></div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="tbl-wrap" style={{ boxShadow: "none" }}>
              <div className="tr th" style={{ gridTemplateColumns: "1.2fr 1fr 70px 70px", padding: "0 14px" }}>
                <div className="thc">Fecha</div><div className="thc">Motivo</div><div className="thc num">Mov.</div><div className="thc num">Saldo</div>
              </div>
              {res.status === "loading" && [0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 40, margin: 10 }} />)}
              {res.status === "error" && <div className="empty">{res.error}</div>}
              {lines.map(({ m, bal }, i) => (
                <div key={m._id} className="tr row-in" style={{ gridTemplateColumns: "1.2fr 1fr 70px 70px", padding: "0 14px", minHeight: 52, "--i": Math.min(i, 10) } as CSSProperties}>
                  <div className="sm-text">{fdate(m.date)}</div>
                  <div className="sm-text muted">{m.reason ?? "—"}</div>
                  <div className="num"><span className={"amt " + (m.type === "IN" ? "tone-ok" : "tone-err")}>{m.type === "IN" ? "+" : "−"}{m.quantity}</span></div>
                  <div className="num amt">{bal}</div>
                </div>
              ))}
              {res.status === "ready" && lines.length === 0 && <div className="empty">Sin movimientos todavía.</div>}
            </div>
            {(res.data?.length ?? 0) > 100 && <div className="muted sm-text">Se muestran los 100 movimientos más recientes de {num(res.data?.length)}.</div>}
          </div>
          <div className="dw-foot">
            <button className="btn t-err" onClick={() => onMove("OUT")}>↘ Registrar salida</button>
            <button className="btn primary" onClick={() => onMove("IN")}>↗ Registrar entrada</button>
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- kardex general ---------------- */
function Kardex({ query, reloadKey }: { query: string; reloadKey: number }) {
  const load = useMemo(() => () => getRecentMovements(300), [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const res = useResource(load);
  const all = res.data ?? [];
  const rows = all.filter((m) => !query || `${m.product.name} ${m.reason ?? ""}`.toLowerCase().includes(query));
  const paging = usePaging(rows, query);

  const columns: Column<InventoryMovement>[] = [
    { header: "Fecha", width: "150px", cell: (m) => <span className="sm-text">{fdate(m.date)}</span> },
    { header: "Producto", width: "minmax(200px, 1.3fr)", cell: (m) => <span className="strong">{m.product.name}</span> },
    { header: "Tipo", width: "110px", cell: (m) => <span className={"badge t-" + (m.type === "IN" ? "ok" : "err")}>{m.type === "IN" ? "Entrada" : "Salida"}</span> },
    { header: "Cantidad", width: "100px", num: true, cell: (m) => <span className={"amt " + (m.type === "IN" ? "tone-ok" : "tone-err")}>{m.type === "IN" ? "+" : "−"}{m.quantity}</span> },
    { header: "Motivo", width: "minmax(180px, 1fr)", cell: (m) => <span className="muted">{m.reason ?? "—"}</span> },
  ];

  if (res.status === "error") return <ErrorCard title="No pudimos cargar el kardex" text={res.error} onRetry={res.reload} />;

  return (
    <>
      <div className="row-btns" style={{ alignItems: "center" }}>
        <span className="muted sm-text">Últimos {num(all.length)} movimientos de todos los productos</span>
        <LoadChip stats={res.stats} records={all.length} noun="movimientos" />
      </div>
      <Table
        label="Kardex de movimientos"
        columns={columns}
        rows={paging.slice}
        rowKey={(m) => m._id}
        minWidth={900}
        loading={res.status === "loading"}
        empty={<Empty icon="inventory" title="No hay movimientos todavía." />}
        footer={<Pager paging={paging} noun="movimientos" />}
      />
    </>
  );
}

export default function Inventory() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // stock | kardex | entrada | salida | historial

  const res = useResource(loadStock);
  const [view, setView] = useState<View>(vista === "kardex" ? "kardex" : "stock");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [kardexKey, setKardexKey] = useState(0);

  const all = res.data ?? [];

  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  let shown = modal;
  if (!shown && !vistaDone && res.data && all[0]) {
    if (vista === "entrada") shown = { kind: "move", type: "IN", productId: [...all].sort((a, b) => a.stock - b.stock)[0].id };
    if (vista === "salida") shown = { kind: "move", type: "OUT", preset: true };
    if (vista === "historial") shown = { kind: "history", id: all[0].id };
  }

  const units = all.reduce((s, r) => s + r.stock, 0);
  const lowCount = all.filter((r) => r.stock <= LOW_STOCK).length; // incluye los agotados, igual que el Panel
  const outCount = all.filter((r) => r.stock === 0).length;

  const base = all.filter((r) => filter === "all" || (filter === "out" ? r.stock === 0 : r.stock <= LOW_STOCK));
  const rows = base.filter((r) => !query || r.name.toLowerCase().includes(query)).sort((a, b) => (filter === "all" ? 0 : a.stock - b.stock));
  const paging = usePaging(rows, `${filter}|${query}`);

  const columns: Column<Row>[] = [
    {
      header: "Producto",
      width: "minmax(240px, 1.4fr)",
      cell: (r) => {
        const c = CAT_ICON[r.category] ?? CAT_ICON.General;
        return (
          <div className="person">
            <span className={`pico ${c.color}`}><Icon name={c.icon} /></span>
            <div className="pc"><div className="strong">{r.name}</div><div className="muted sm-text">{r.category}</div></div>
          </div>
        );
      },
    },
    { header: "Stock", width: "190px", cell: (r) => <StockBar stock={r.stock} /> },
    { header: "Estado", width: "140px", cell: (r) => <Badge tone={statusOf(r.stock).tone}>{statusOf(r.stock).label}</Badge> },
    {
      header: "Acciones",
      width: "minmax(260px, 1fr)",
      num: true,
      cell: (r) => (
        <div className="acts">
          <button className="btn sm t-ok" onClick={() => open({ kind: "move", type: "IN", productId: r.id })} aria-label={`Registrar entrada de ${r.name}`}>↗ Entrada</button>
          <button className="btn sm t-err" onClick={() => open({ kind: "move", type: "OUT", productId: r.id })} aria-label={`Registrar salida de ${r.name}`}>↘ Salida</button>
          <button className="btn sm ghost" onClick={() => open({ kind: "history", id: r.id })}>Historial</button>
        </div>
      ),
    },
  ];

  const historyRow = shown?.kind === "history" ? all.find((r) => r.id === shown.id) : undefined;

  return (
    <Page
      title="Inventario"
      service="products-service"
      subtitle="Stock al día y kardex de movimientos"
      search={{ value: q, onChange: setQ, placeholder: "Producto o motivo", label: "Buscar en inventario" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "move", type: "IN" })}>
          <Icon name="plus" />
          Registrar movimiento
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar el inventario" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}>
            <section className="card kpi lift rise" style={{ "--i": 0 } as CSSProperties}>
              <div className="kpi-top"><span className="overline">Unidades en bodega</span><span className="kico t-bal"><Icon name="inventory" /></span></div>
              <div className="amt-lg">{num(units)}</div>
              <div className="muted sm-text">en {num(all.length)} productos</div>
            </section>
            <section className="card kpi lift rise" style={{ "--i": 1 } as CSSProperties}>
              <div className="kpi-top"><span className="overline">Por reponer</span><span className="kico t-warn"><Icon name="alert" /></span></div>
              <div className="amt-lg">{num(lowCount)}</div>
              <div className="muted sm-text">{LOW_STOCK} unidades o menos (con los agotados)</div>
            </section>
            <section className="card kpi lift rise" style={{ "--i": 2 } as CSSProperties}>
              <div className="kpi-top"><span className="overline">Agotados</span><span className="kico ico-t t-err"><Icon name="x" /></span></div>
              <div className="amt-lg">{num(outCount)}</div>
              <div className="muted sm-text">No se pueden cargar a una cuenta</div>
            </section>
          </div>

          <div className="bar-row">
            <Seg<View> label="Vista de inventario" value={view} onChange={setView} items={[{ key: "stock", label: "Stock", count: all.length }, { key: "kardex", label: "Kardex" }]} />
            {view === "stock" && (
              <Seg<StockFilter>
                label="Filtrar stock"
                value={filter}
                onChange={setFilter}
                items={[{ key: "all", label: "Todos" }, { key: "low", label: "Por reponer", count: lowCount }, { key: "out", label: "Agotados", count: outCount }]}
              />
            )}
          </div>

          {view === "stock" ? (
            <>
              <div className="row-btns" style={{ alignItems: "center" }}>
                <span className="muted sm-text">{query ? `${num(rows.length)} de ${num(base.length)} productos` : plural(base.length, "producto", "productos")}</span>
                <LoadChip stats={res.stats} records={all.length} noun="productos" />
                {res.stats && <span className="muted sm-text">{kb(res.stats.bytes)} descargados</span>}
              </div>
              <div className={res.refreshing ? "refreshing" : undefined}>
                <Table
                  label="Stock por producto"
                  columns={columns}
                  rows={paging.slice}
                  rowKey={(r) => r.id}
                  minWidth={980}
                  freshId={fresh}
                  loading={res.status === "loading"}
                  empty={<Empty icon="inventory" title={query ? `Nada coincide con “${q.trim()}”.` : "No hay productos en este estado."} />}
                  footer={<Pager paging={paging} noun="productos" />}
                />
              </div>
            </>
          ) : (
            <Kardex query={query} reloadKey={kardexKey} />
          )}
        </>
      )}

      {shown?.kind === "move" && res.data && (
        <MoveModal
          rows={all}
          initialType={shown.type}
          initialProductId={shown.productId}
          preset={shown.preset}
          onClose={() => open(null)}
          onSaved={(type, row, qty) => {
            setFresh(row.id);
            setTimeout(() => setFresh(null), 1900);
            res.refresh();
            setKardexKey((k) => k + 1);
            open(null);
            toast(`${type === "IN" ? "Entrada" : "Salida"} registrada · ${qty} × ${row.name}`);
          }}
        />
      )}
      {shown?.kind === "history" && historyRow && (
        <HistoryDrawer row={historyRow} onClose={() => open(null)} onMove={(type) => open({ kind: "move", type, productId: historyRow.id })} />
      )}
    </Page>
  );
}
