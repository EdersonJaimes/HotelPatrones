import { useMemo, useState, type CSSProperties } from "react";
import { errMsg, fdate, fmt, plural } from "../../lib/format";
import { accountOf, ROOM_TYPE } from "../../lib/stay";
import { useResource } from "../../lib/useResource";
import { getProducts } from "../../services/productService";
import { addProduct, checkout, getActiveStay } from "../../services/stayService";
import type { Checkout, Room, Stay } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay from "../../ui/Overlay";
import { BusyButton, ConfirmHead, ModalHead, NoteBox, Stepper } from "../../ui/parts";

interface Line {
  key: string;
  productId?: string;
  name: string;
  qty: string;
  unit: string;
  sub: number;
}

// Consumos de la estancia: el servicio guarda una línea por cada "agregar"; aquí se juntan por producto.
function consumptionLines(stay: Stay): Line[] {
  const map = new Map<string, { productId: string; name: string; qty: number; unit: number }>();
  stay.products.forEach((l) => {
    const key = `${l.product._id}|${l.unitPrice}`;
    const cur = map.get(key);
    if (cur) cur.qty += l.quantity;
    else map.set(key, { productId: l.product._id, name: l.product.name, qty: l.quantity, unit: l.unitPrice });
  });
  return [...map.entries()].map(([key, v]) => ({
    key,
    productId: v.productId,
    name: v.name,
    qty: `× ${v.qty}`,
    unit: fmt(v.unit),
    sub: v.qty * v.unit,
  }));
}

function lodgingLine(stay: Stay, hours: number, total: number): Line {
  return { key: "lodging", name: "Hospedaje", qty: plural(hours, "hora", "horas"), unit: fmt(stay.hourlyRate), sub: total };
}

function Lines({ lines, flashId }: { lines: Line[]; flashId?: string | null }) {
  return (
    <div className="lines">
      {lines.map((l, i) => (
        <div key={l.key} className={"line" + (flashId && l.productId === flashId ? " flash" : " rise")} style={{ "--i": i } as CSSProperties}>
          <div>
            <div className="strong">{l.name}</div>
            <div className="muted sm-text">{l.qty} · {l.unit}</div>
          </div>
          <div className="amt">{fmt(l.sub)}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- cuenta abierta ---------------- */
export function AccountModal({
  room,
  preset,
  onClose,
  onCheckout,
}: {
  room: Room;
  preset?: "stock";
  onClose: () => void;
  onCheckout: (stay: Stay) => void;
}) {
  const loadStay = useMemo(() => () => getActiveStay(room._id), [room._id]);
  const stayRes = useResource(loadStay);
  const productsRes = useResource(getProducts);

  const [updated, setUpdated] = useState<Stay | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pq, setPq] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const [busy, setBusy] = useState(false);

  const stay = updated ?? stayRes.data;
  const all = productsRes.data ?? [];

  // ?vista=stock: se elige el producto con menos existencias y se pide una unidad de más.
  const lowest = preset ? all.filter((p) => p.stock > 0).sort((a, b) => a.stock - b.stock)[0] : undefined;
  const selId = sel ?? lowest?._id ?? "";
  const selected = all.find((p) => p._id === selId);
  const amount = qty ?? (lowest && sel === null ? lowest.stock + 1 : 1);
  const presetErr = lowest && sel === null && err === null ? `Stock insuficiente: quedan ${lowest.stock} ${lowest.name} y pediste ${lowest.stock + 1}.` : "";
  const shownErr = err ?? presetErr;

  const query = pq.trim().toLowerCase();
  const tiles = all.filter((p) => p.stock > 0 && (!query || p.name.toLowerCase().includes(query))).slice(0, 12);

  const add = async () => {
    if (!stay) return;
    if (!selected) return setErr("Elige un producto de la lista.");
    if (amount > selected.stock) return setErr(`Stock insuficiente: quedan ${selected.stock} ${selected.name} y pediste ${amount}.`);
    setBusy(true);
    try {
      const next = await addProduct({ stayId: stay._id, productId: selected._id, quantity: amount });
      setUpdated(next);
      setFlash(selected._id);
      setSel(null);
      setQty(1);
      setErr("");
      setBump((b) => b + 1);
      productsRes.refresh();
      setTimeout(() => setFlash(null), 1500);
    } catch (e) {
      setErr(errMsg(e, "No se pudo agregar el producto"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay label={`Cuenta habitación ${room.number}`} onClose={onClose}>
      {(close) => {
        if (stayRes.status !== "ready" || !stay) {
          return (
            <>
              <ModalHead overline="Cuenta abierta" title={`Habitación ${room.number}`} sub={stayRes.status === "error" ? stayRes.error : "Cargando la cuenta…"} onClose={close} />
              {stayRes.status === "loading" ? <div className="skel" style={{ height: 140 }} /> : <div className="m-foot"><button className="btn primary" onClick={stayRes.reload}>Reintentar</button></div>}
            </>
          );
        }
        const acc = accountOf(stay);
        const lines = [lodgingLine(stay, acc.hours, acc.roomTotal), ...consumptionLines(stay)];
        return (
          <>
            <ModalHead
              overline="Cuenta abierta"
              title={`Habitación ${room.number}`}
              sub={`${ROOM_TYPE[room.type]} · desde ${fdate(stay.startedAt)} · ${fmt(stay.hourlyRate)} por hora`}
              onClose={close}
            />
            <Lines lines={lines} flashId={flash} />

            <div className="add">
              <div className="lbl">Agregar consumo</div>
              <label className="pick-search">
                <Icon name="search" />
                <span className="sr">Buscar producto</span>
                <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder={`Buscar entre ${all.length.toLocaleString("es-CO")} productos`} />
              </label>
              <div className="pick" role="group" aria-label="Productos disponibles">
                {productsRes.status === "loading" && [0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 52 }} />)}
                {tiles.map((p) => (
                  <button
                    key={p._id}
                    className={"ptile" + (selId === p._id ? " on" : "")}
                    aria-pressed={selId === p._id}
                    onClick={() => {
                      setSel(p._id);
                      setErr("");
                    }}
                  >
                    <span className="strong">{p.name}</span>
                    <span className="muted sm-text">{fmt(p.price)} · {p.stock} disp.</span>
                  </button>
                ))}
                {productsRes.status === "ready" && tiles.length === 0 && <span className="muted sm-text">Ningún producto con existencias coincide.</span>}
              </div>
              <div className="add-row">
                <Stepper value={amount} onChange={(v) => { setQty(v); setErr(""); }} label="Cantidad" />
                <button className={"btn primary plus" + (busy ? " busy" : "")} onClick={add} disabled={busy}>
                  {busy ? <span className="spin" aria-hidden="true" /> : <Icon name="plus" />}
                  Agregar a la cuenta
                </button>
              </div>
              {shownErr && <NoteBox tone="err" icon="alert">{shownErr}</NoteBox>}
            </div>

            <div className="tots">
              <div className="tot"><span className="muted">Hospedaje · {plural(acc.hours, "hora", "horas")}</span><span className="amt">{fmt(acc.roomTotal)}</span></div>
              <div className="tot"><span className="muted">Consumo</span><span className="amt">{fmt(acc.productsTotal)}</span></div>
              <div className="tot grand"><span className="strong">Total a la fecha</span><span className={"amt-lg " + (bump % 2 ? "bumpA" : "bumpB")}>{fmt(acc.total)}</span></div>
            </div>
            <div className="m-foot">
              <button className="btn ghost" onClick={close}>Cerrar</button>
              <button className="btn primary" onClick={() => onCheckout(stay)}>Hacer check-out</button>
            </div>
          </>
        );
      }}
    </Overlay>
  );
}

/* ---------------- confirmar check-out ---------------- */
export function CheckoutModal({
  room,
  stay,
  onClose,
  onBack,
  onDone,
}: {
  room: Room;
  stay: Stay;
  onClose: () => void;
  onBack: () => void;
  onDone: (result: Checkout) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const acc = accountOf(stay);

  const confirm = async () => {
    setBusy(true);
    setErr("");
    try {
      onDone(await checkout(stay._id));
    } catch (e) {
      setErr(errMsg(e, "No se pudo hacer el check-out"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Confirmar check-out" onClose={onClose}>
      {() => (
        <>
          <ConfirmHead
            icon="checkout"
            tone="brand"
            title={`¿Hacer check-out de la ${room.number}?`}
            text="Se cierra la cuenta y la habitación pasa a aseo."
          />
          <div className="tots">
            <div className="tot"><span className="muted">Hospedaje · {plural(acc.hours, "hora", "horas")}</span><span className="amt">{fmt(acc.roomTotal)}</span></div>
            <div className="tot"><span className="muted">Consumo · {plural(acc.items, "producto", "productos")}</span><span className="amt">{fmt(acc.productsTotal)}</span></div>
            <div className="tot grand"><span className="strong">Total a pagar</span><span className="amt-lg">{fmt(acc.total)}</span></div>
          </div>
          <div className="muted sm-text">El valor final lo calcula el servicio al cerrar, con la hora exacta de salida.</div>
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={onBack}>Volver a la cuenta</button>
            <BusyButton busy={busy} label="Sí, hacer check-out" busyLabel="Cerrando cuenta…" onClick={confirm} />
          </div>
        </>
      )}
    </Overlay>
  );
}

/* ---------------- cuenta final ---------------- */
export function InvoiceModal({ room, stay, result, onClose }: { room: Room | null; stay: Stay; result: Checkout; onClose: () => void }) {
  const lines = [lodgingLine(stay, result.hours, result.roomTotal), ...consumptionLines(stay)];

  return (
    <Overlay label="Cuenta final" onClose={onClose}>
      {(close) => (
        <>
          <div className="inv-top">
            <div className="okc">
              <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <div className="overline">Check-out listo</div>
            <h2>Habitación {result.roomNumber}{room ? ` · ${ROOM_TYPE[room.type]}` : ""}</h2>
            <div className="muted sm-text">Entrada {fdate(stay.startedAt)} · Salida {fdate(stay.endedAt ?? new Date())}</div>
          </div>
          <Lines lines={lines} />
          <div className="tots">
            <div className="tot"><span className="muted">Hospedaje</span><span className="amt">{fmt(result.roomTotal)}</span></div>
            <div className="tot"><span className="muted">Consumo</span><span className="amt">{fmt(result.productsTotal)}</span></div>
            <div className="tot grand"><span className="strong">Total pagado</span><span className="amt-xl">{fmt(result.total)}</span></div>
          </div>
          <NoteBox tone="warn" icon="clock">La habitación quedó en aseo. Cuando termine, márcala como disponible.</NoteBox>
          <div className="m-foot">
            <button className="btn ghost" onClick={() => window.print()}><Icon name="print" />Imprimir</button>
            <button className="btn primary" onClick={close}>Listo</button>
          </div>
        </>
      )}
    </Overlay>
  );
}
