import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { errMsg, fmt, num, plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { getTopConsumed } from "../../services/inventoryService";
import { createProduct, deleteProduct, getProducts, updateProduct } from "../../services/productService";
import { LOW_STOCK, type Product, type ProductCategory } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { BusyButton, ConfirmHead, Empty, ErrorCard, LoadChip, NoteBox, Opts, Pager, Seg, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { usePaging } from "../../lib/usePaging";
import { useToast } from "../../ui/Toast";
import { CAT_ICON, CATEGORIES } from "./catalog";

type Filter = "all" | ProductCategory;

type ModalState = { kind: "form"; editing: Product | null } | { kind: "delete"; id: string };

async function loadPage() {
  // "Vendidos" sale del kardex (suma de salidas por producto).
  const [products, top] = await Promise.all([getProducts(), getTopConsumed(5000).catch(() => [])]);
  const sold = new Map(top.map((t) => [String(t._id), t.total]));
  return { products, sold };
}

export function StockBar({ stock }: { stock: number }) {
  const tone = stock === 0 ? "err" : stock <= LOW_STOCK ? "warn" : "ok";
  return (
    <div className="stock">
      <div className="bar-track sm"><div className={`bar ${tone}`} style={{ width: `${Math.min(100, (stock / 60) * 100)}%` }} /></div>
      <span className={`amt${tone === "ok" ? "" : " tone-" + tone}`}>{num(stock)}</span>
    </div>
  );
}

function ProductForm({ editing, onClose, onSaved }: { editing: Product | null; onClose: () => void; onSaved: (product: Product, created: boolean) => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [category, setCategory] = useState<ProductCategory>(editing?.category ?? "General");
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
  const [serverErr, setServerErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const save = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Escribe el nombre del producto";
    if (price === "" || isNaN(Number(price)) || Number(price) < 0) e.price = "Escribe un precio válido";
    if (Object.keys(e).length) {
      setErrors(e);
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setServerErr("");
    try {
      const data = { name: name.trim(), price: Number(price), category };
      onSaved(editing ? await updateProduct(editing._id, data) : await createProduct(data), !editing);
    } catch (err) {
      setServerErr(errMsg(err, "No se pudo guardar el producto"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const title = editing ? "Editar producto" : "Nuevo producto";

  return (
    <Overlay kind="drawer" label={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div><div className="overline">products-service</div><h2>{title}</h2></div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className={"form" + (shake ? (shake % 2 ? " shake-a" : " shake-b") : "")}>
              <div className="fld">
                <label className="lbl" htmlFor="p-name">Nombre *</label>
                <input id="p-name" className={"inp" + (errors.name ? " bad" : "")} value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} placeholder="Ej. Agua 600 ml" autoComplete="off" />
                {errors.name && <div className="ferr">{errors.name}</div>}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="p-price">Precio de venta *</label>
                <input id="p-price" className={"inp" + (errors.price ? " bad" : "")} type="number" value={price} onChange={(e) => { setPrice(e.target.value); setErrors((x) => ({ ...x, price: undefined })); }} placeholder="0" />
                <div className="help">En pesos, sin puntos ni signos.</div>
                {errors.price && <div className="ferr">{errors.price}</div>}
              </div>
              <div className="fld">
                <span className="lbl">Categoría</span>
                <Opts<ProductCategory> label="Categoría" value={category} onPick={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </div>
            </div>
            <div className="add">
              <div className="lbl">Así se verá en la cuenta de una habitación</div>
              <div className="ptile on" style={{ maxWidth: 220 }}>
                <span className="strong">{name.trim() || "Nombre del producto"}</span>
                <span className="muted sm-text">{price ? fmt(Number(price)) : "$ 0"}</span>
              </div>
            </div>
            <NoteBox tone="info">
              {editing ? `Hay ${num(editing.stock)} unidades en bodega.` : "Empieza con 0 unidades."} El stock solo cambia desde Inventario.{" "}
              <Link to="/inventory?vista=entrada" className="link-btn">Registrar entrada</Link>
            </NoteBox>
            {serverErr && <NoteBox tone="err" icon="alert">{serverErr}</NoteBox>}
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label={editing ? "Guardar cambios" : "Crear producto"} busyLabel="Guardando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

function DeleteModal({ product, onClose, onDeleted }: { product: Product; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteProduct(product._id);
      onDeleted();
    } catch (e) {
      setErr(errMsg(e, "No se pudo eliminar el producto"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Eliminar producto" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead icon="trash" tone="err" title={`¿Eliminar ${product.name}?`} text="Deja de aparecer al agregar consumos. Los consumos ya cobrados se conservan." />
          {product.stock > 0 && <NoteBox tone="warn" icon="alert">Todavía hay {plural(product.stock, "unidad", "unidades")} en bodega. Se pierde su registro de stock.</NoteBox>}
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

export default function Products() {
  const toast = useToast();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // nuevo | editar | eliminar

  const res = useResource(loadPage);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const all = res.data?.products ?? [];
  const sold = res.data?.sold;

  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  let shown = modal;
  if (!shown && !vistaDone && res.data && all[0]) {
    if (vista === "nuevo") shown = { kind: "form", editing: null };
    if (vista === "editar") shown = { kind: "form", editing: all[0] };
    if (vista === "eliminar") shown = { kind: "delete", id: all[0]._id };
  }

  const mark = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1900);
  };

  const base = all.filter((p) => filter === "all" || p.category === filter);
  const rows = base.filter((p) => !query || `${p.name} ${p.category}`.toLowerCase().includes(query));
  const paging = usePaging(rows, `${filter}|${query}`);
  const countOf = (c: Filter) => (c === "all" ? all.length : all.filter((p) => p.category === c).length);

  const columns: Column<Product>[] = [
    {
      header: "Producto",
      width: "minmax(240px, 1.4fr)",
      cell: (p) => {
        const c = CAT_ICON[p.category] ?? CAT_ICON.General;
        return (
          <div className="person">
            <span className={`pico ${c.color}`}><Icon name={c.icon} /></span>
            <div className="pc"><div className="strong">{p.name}</div><div className="muted sm-text">{p.category}</div></div>
          </div>
        );
      },
    },
    { header: "Precio", width: "120px", num: true, cell: (p) => <span className="amt">{fmt(p.price)}</span> },
    { header: "Stock", width: "190px", cell: (p) => <StockBar stock={p.stock} /> },
    { header: "Vendidos", width: "110px", num: true, cell: (p) => num(sold?.get(p._id) ?? 0) },
    {
      header: "Acciones",
      width: "110px",
      num: true,
      cell: (p) => (
        <div className="acts">
          <button className="icon-btn soft" onClick={() => open({ kind: "form", editing: p })} aria-label={`Editar ${p.name}`}><Icon name="edit" /></button>
          <button className="icon-btn soft danger" onClick={() => open({ kind: "delete", id: p._id })} aria-label={`Eliminar ${p.name}`}><Icon name="trash" /></button>
        </div>
      ),
    },
  ];

  const target = shown?.kind === "delete" ? all.find((p) => p._id === shown.id) : undefined;

  return (
    <Page
      title="Productos"
      service="products-service"
      subtitle="Lo que vendes dentro del hotel"
      search={{ value: q, onChange: setQ, placeholder: "Buscar producto", label: "Buscar productos" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null })}>
          <Icon name="plus" />
          Nuevo producto
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar los productos" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="bar-row">
            <Seg<Filter>
              label="Filtrar por categoría"
              value={filter}
              onChange={setFilter}
              items={[{ key: "all", label: "Todos", count: countOf("all") }, ...CATEGORIES.map((c) => ({ key: c as Filter, label: c, count: countOf(c) }))]}
            />
            <div className="row-btns" style={{ alignItems: "center" }}>
              <span className="muted sm-text">{query ? `${num(rows.length)} de ${num(base.length)} productos` : plural(base.length, "producto", "productos")}</span>
              <LoadChip stats={res.stats} records={all.length} noun="productos" />
            </div>
          </div>
          <div className={res.refreshing ? "refreshing" : undefined}>
            <Table
              label="Productos"
              columns={columns}
              rows={paging.slice}
              rowKey={(p) => p._id}
              minWidth={900}
              freshId={fresh}
              loading={res.status === "loading"}
              empty={<Empty icon="product" title={query ? `Nada coincide con “${q.trim()}”.` : "No hay productos en esta categoría."} />}
              footer={<Pager paging={paging} noun="productos" />}
            />
          </div>
        </>
      )}

      {shown?.kind === "form" && (
        <ProductForm
          editing={shown.editing}
          onClose={() => open(null)}
          onSaved={(product, created) => {
            mark(product._id);
            res.refresh();
            open(null);
            toast(created ? `${product.name} agregado al catálogo` : "Producto actualizado");
          }}
        />
      )}
      {shown?.kind === "delete" && target && (
        <DeleteModal
          product={target}
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
