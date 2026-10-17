import type { CSSProperties, ReactNode } from "react";
import type { Paging } from "../lib/usePaging";
import { kb, ms as fmtMs, num } from "../lib/format";
import type { LoadStats } from "../lib/useResource";
import { speedTone } from "../lib/perf";
import Icon, { type IconName } from "./Icon";

/* ---------- Badge ---------- */
export type Tone = "ok" | "err" | "bal" | "warn" | "info" | "mute" | "brand";

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`badge t-${tone}`}>
      <span className="bd" />
      {children}
    </span>
  );
}

/* ---------- Segmented control con "thumb" deslizante ---------- */
export interface SegItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  cls?: string;
}

export function Seg<K extends string>({
  items,
  value,
  onChange,
  label,
  full,
  className = "",
}: {
  items: SegItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  full?: boolean;
  className?: string;
}) {
  const idx = Math.max(0, items.findIndex((i) => i.key === value));
  const thumb: CSSProperties = {
    width: `calc((100% - 8px) / ${items.length})`,
    transform: `translateX(${idx * 100}%)`,
  };

  return (
    <div className="seg-wrap">
      <div className={`seg ${className}`.trim()} role="group" aria-label={label} style={full ? { width: "100%" } : undefined}>
        <div className="seg-thumb" style={thumb} />
        {items.map((it) => (
          <button
            key={it.key}
            className={"seg-btn" + (it.key === value ? " on " + (it.cls ?? "") : "")}
            aria-pressed={it.key === value}
            onClick={() => it.key !== value && onChange(it.key)}
          >
            {it.label}
            {it.count !== undefined && <span className="seg-count">{num(it.count)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Opciones tipo "chip" (una sola o varias) ---------- */
export function Opts<T extends string>({
  options,
  value,
  onPick,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | T[];
  onPick: (value: T) => void;
  label: string;
}) {
  const selected = Array.isArray(value) ? value : [value];
  return (
    <div className="opts" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={"opt" + (selected.includes(o.value) ? " on" : "")}
          aria-pressed={selected.includes(o.value)}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Stepper (+ / -) ---------- */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="step">
      <button type="button" className="step-b" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label}: uno menos`}>
        <Icon name="minus" />
      </button>
      <span className="step-v">{value}</span>
      <button type="button" className="step-b" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label}: uno más`}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

/* ---------- Estado vacío ---------- */
export function Empty({ icon = "search", title, children }: { icon?: IconName; title?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ico">
        <Icon name={icon} />
      </span>
      {title && (
        <div className="strong" style={{ color: "var(--ink)" }}>
          {title}
        </div>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}

/* ---------- Tabla ---------- */
export interface Column<T> {
  header: string;
  width: string;
  num?: boolean;
  cell: (row: T) => ReactNode;
}

export function Table<T>({
  label,
  columns,
  rows,
  rowKey,
  minWidth,
  freshId,
  empty,
  footer,
  loading,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  minWidth: number;
  freshId?: string | null;
  empty?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) {
  const grid: CSSProperties = { gridTemplateColumns: columns.map((c) => c.width).join(" ") };

  return (
    <div className="tbl-wrap rise" style={{ "--i": 1 } as CSSProperties}>
      <div role="table" aria-label={label} style={{ minWidth }}>
        <div className="tr th" role="row" style={grid}>
          {columns.map((c) => (
            <div key={c.header} className={"thc" + (c.num ? " num" : "")} role="columnheader">
              {c.header}
            </div>
          ))}
        </div>
        {loading ? (
          <div className="tbl-skel" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="tr" style={grid}>
                {columns.map((c) => (
                  <div key={c.header} className="td">
                    <div className="skel" style={{ height: 16, width: c.num ? "50%" : "70%", marginLeft: c.num ? "auto" : 0 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          rows.map((row, i) => {
            const key = rowKey(row);
            return (
              <div
                key={key}
                className={"tr row-in" + (freshId === key ? " fresh" : "")}
                role="row"
                style={{ ...grid, "--i": Math.min(i, 12) } as CSSProperties}
              >
                {columns.map((c) => (
                  <div key={c.header} className={"td" + (c.num ? " num" : "")} role="cell">
                    {c.cell(row)}
                  </div>
                ))}
              </div>
            );
          })
        )}
        {!loading && rows.length === 0 && empty}
      </div>
      {footer}
    </div>
  );
}

/* ---------- Paginación en el navegador ---------- */
export function Pager({ paging, noun = "registros" }: { paging: Omit<Paging, "slice">; noun?: string }) {
  const { page, pages, size, total } = paging;
  if (total === 0) return null;
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  return (
    <div className="pager">
      <span className="pg-info">
        {num(from)}–{num(to)} de {num(total)} {noun}
      </span>
      <div className="pg-ctl">
        <label className="sr" htmlFor="pg-size">
          Filas por página
        </label>
        <select id="pg-size" value={size} onChange={(e) => paging.setSize(Number(e.target.value))}>
          {[20, 50, 100, 250].map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
        <button className="icon-btn sq" onClick={() => paging.setPage(0)} disabled={page === 0} aria-label="Primera página">
          <Icon name="collapse" />
        </button>
        <button className="icon-btn sq" onClick={() => paging.setPage(page - 1)} disabled={page === 0} aria-label="Página anterior">
          <Icon name="left" />
        </button>
        <span className="pg-n">
          {page + 1} / {num(pages)}
        </span>
        <button className="icon-btn sq" onClick={() => paging.setPage(page + 1)} disabled={page >= pages - 1} aria-label="Página siguiente">
          <Icon name="right" />
        </button>
      </div>
    </div>
  );
}

// Reutilizable para Table + Pager: el pager va dentro de la tarjeta de la tabla.
export function PagerFooter({ paging, noun }: { paging: Omit<Paging, "slice">; noun?: string }) {
  return <Pager paging={paging} noun={noun} />;
}

/* ---------- Chip con lo que costó cargar la pantalla ---------- */
export function LoadChip({ stats, records, noun = "registros" }: { stats: LoadStats | null; records?: number; noun?: string }) {
  if (!stats) return null;
  const tone = speedTone(stats.ms);
  return (
    <span className={`load-chip ${tone}`} title="Tiempo medido en el navegador, desde que se pidió hasta que llegó todo">
      <Icon name="bolt" className="" />
      <b className="ms">{fmtMs(stats.ms)}</b>
      <span>· {kb(stats.bytes)}</span>
      <span>· {stats.requests} {stats.requests === 1 ? "petición" : "peticiones"}</span>
      {records !== undefined && <span>· {num(records)} {noun}</span>}
    </span>
  );
}

/* ---------- Pantalla de error con reintento ---------- */
export function ErrorCard({ title, text, onRetry }: { title: string; text: string; onRetry: () => void }) {
  return (
    <div className="card page-in err-box">
      <div className="empty">
        <span className="conf-ico ico-t t-err">
          <Icon name="alert" />
        </span>
        <h2 className="h3" style={{ color: "var(--ink)", fontSize: 20, lineHeight: "28px" }}>
          {title}
        </h2>
        <div>{text}</div>
        <button className="btn primary" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

/* ---------- Botón con spinner ---------- */
export function BusyButton({
  busy,
  label,
  busyLabel,
  className = "btn primary",
  onClick,
  disabled,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className={className + (busy ? " busy" : "")} onClick={onClick} disabled={disabled}>
      {busy && <span className="spin" aria-hidden="true" />}
      {busy ? busyLabel : label}
    </button>
  );
}

export function NoteBox({ tone, icon = "info", children }: { tone: "warn" | "info" | "err" | "ok"; icon?: IconName; children: ReactNode }) {
  return (
    <div className={`note-box t-${tone}`}>
      <Icon name={icon} />
      <span>{children}</span>
    </div>
  );
}

/* Cabecera de un cuadro de diálogo */
export function ModalHead({ overline, title, sub, onClose }: { overline: string; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="m-head">
      <div>
        <div className="overline">{overline}</div>
        <h2>{title}</h2>
        {sub && <div className="muted sm-text">{sub}</div>}
      </div>
      <button className="icon-btn soft" onClick={onClose} aria-label="Cerrar">
        <Icon name="x" />
      </button>
    </div>
  );
}

/* Confirmación centrada (eliminar, cancelar, aseo, check-out) */
export function ConfirmHead({ icon, tone, title, text }: { icon: IconName; tone: Tone; title: string; text?: ReactNode }) {
  return (
    <div className="conf">
      <span className={`conf-ico ico-t t-${tone}`}>
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      {text && <div className="muted">{text}</div>}
    </div>
  );
}
