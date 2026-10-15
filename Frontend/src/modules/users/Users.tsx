import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMsg, initials, num, plural } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { createUser, deleteUser, getUsers, updateUser } from "../../services/userService";
import type { User } from "../../types/domain";
import Icon from "../../ui/Icon";
import Overlay, { CloseButton } from "../../ui/Overlay";
import { Badge, BusyButton, ConfirmHead, Empty, ErrorCard, LoadChip, NoteBox, Seg, Table, type Column } from "../../ui/parts";
import { Page } from "../../ui/Shell";
import { useToast } from "../../ui/Toast";

type Filter = "all" | User["role"];

type ModalState = { kind: "form"; editing: User | null } | { kind: "delete"; id: string };

const ROLES: { value: User["role"]; label: string; desc: string; access: string[] }[] = [
  { value: "admin", label: "Administrador", desc: "Todo el sistema", access: ["Panel", "Recepción", "Reservas", "Hotel", "Tienda", "Equipo"] },
  { value: "recepcionista", label: "Recepcionista", desc: "Recepción y reservas", access: ["Recepción", "Reservas"] },
];

// Usuario que tiene la sesión abierta (viene en el JWT): no puede borrarse a sí mismo.
function currentUsername(token: string | null): string | null {
  try {
    return token ? JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).username ?? null : null;
  } catch {
    return null;
  }
}

function strength(p: string): number {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return p ? Math.max(1, s) : 0;
}

function UserForm({ editing, onClose, onSaved }: { editing: User | null; onClose: () => void; onSaved: (name: string, created: boolean) => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [username, setUsername] = useState(editing?.username ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<User["role"]>(editing?.role ?? "recepcionista");
  const [errors, setErrors] = useState<{ name?: string; username?: string; password?: string }>({});
  const [serverErr, setServerErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const save = async () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Escribe el nombre";
    if (!editing && !/^[a-z0-9._-]{3,50}$/.test(username.trim())) e.username = "3 a 50 caracteres: minúsculas, números, punto o guion";
    if (!editing && password.length < 6) e.password = "Mínimo 6 caracteres";
    if (editing && password && password.length < 6) e.password = "Mínimo 6 caracteres";
    if (Object.keys(e).length) {
      setErrors(e);
      setShake((s) => s + 1);
      return;
    }
    setBusy(true);
    setServerErr("");
    try {
      if (editing) await updateUser(editing._id, { name: name.trim(), role, ...(password ? { password } : {}) });
      else await createUser({ name: name.trim(), username: username.trim(), password, role });
      onSaved(name.trim(), !editing);
    } catch (err) {
      setServerErr(errMsg(err, "No se pudo guardar el usuario"));
      setShake((s) => s + 1);
      setBusy(false);
    }
  };

  const title = editing ? "Editar usuario" : "Nuevo usuario";
  const level = strength(password);

  return (
    <Overlay kind="drawer" label={title} onClose={onClose}>
      {(close) => (
        <>
          <div className="dw-head m-head">
            <div><div className="overline">auth-service</div><h2>{title}</h2></div>
            <CloseButton onClick={close} />
          </div>
          <div className="dw-body">
            <div className={"form" + (shake ? (shake % 2 ? " shake-a" : " shake-b") : "")}>
              <div className="fld">
                <label className="lbl" htmlFor="u-name">Nombre *</label>
                <input id="u-name" className={"inp" + (errors.name ? " bad" : "")} value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} placeholder="Nombre y apellido" autoComplete="off" />
                {errors.name && <div className="ferr">{errors.name}</div>}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="u-user">Usuario *</label>
                <input id="u-user" className={"inp" + (errors.username ? " bad" : "")} value={username} disabled={!!editing} onChange={(e) => { setUsername(e.target.value.toLowerCase()); setErrors((x) => ({ ...x, username: undefined })); }} placeholder="Ej. pruiz" autoComplete="off" />
                <div className="help">{editing ? "El usuario no se puede cambiar." : "Minúsculas y números, sin espacios. Con esto inicia sesión."}</div>
                {errors.username && <div className="ferr">{errors.username}</div>}
              </div>
              <div className="fld">
                <label className="lbl" htmlFor="u-pass">{editing ? "Nueva contraseña (opcional)" : "Contraseña *"}</label>
                <div className="pw">
                  <input id="u-pass" className={"inp" + (errors.password ? " bad" : "")} type={show ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); }} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                  <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    <Icon name={show ? "eyeOff" : "eye"} />
                  </button>
                </div>
                <div className={`meter l${level}`} aria-hidden="true"><span /><span /><span /><span /></div>
                <div className="help">{editing ? "Déjala vacía para conservar la actual." : level < 2 ? "Usa 10 o más caracteres para una clave más fuerte." : "Buena contraseña."}</div>
                {errors.password && <div className="ferr">{errors.password}</div>}
              </div>
              <div className="fld">
                <span className="lbl">Rol</span>
                <div className="proto" role="group" aria-label="Rol">
                  {ROLES.map((r) => (
                    <button key={r.value} type="button" className={"proto-c" + (role === r.value ? " on" : "")} aria-pressed={role === r.value} onClick={() => setRole(r.value)}>
                      <span className="strong">{r.label}</span>
                      <span className="muted sm-text">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {serverErr && <NoteBox tone="err" icon="alert">{serverErr}</NoteBox>}
          </div>
          <div className="dw-foot">
            <button className="btn ghost" onClick={close}>Cancelar</button>
            <BusyButton busy={busy} label={editing ? "Guardar cambios" : "Crear usuario"} busyLabel="Guardando…" onClick={save} />
          </div>
        </>
      )}
    </Overlay>
  );
}

function DeleteModal({ user, blockText, onClose, onDeleted }: { user: User; blockText: string; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteUser(user._id);
      onDeleted();
    } catch (e) {
      setErr(errMsg(e, "No se pudo eliminar el usuario"));
      setBusy(false);
    }
  };

  return (
    <Overlay size="sm" label="Eliminar usuario" onClose={onClose}>
      {(close) => (
        <>
          <ConfirmHead icon="trash" tone="err" title={`¿Eliminar a ${user.name}?`} text="Ya no podrá iniciar sesión. Lo que registró antes se conserva." />
          {blockText && <NoteBox tone="warn" icon="alert">{blockText}</NoteBox>}
          {err && <NoteBox tone="err" icon="alert">{err}</NoteBox>}
          <div className="m-foot">
            <button className="btn ghost" onClick={close}>Conservar</button>
            <BusyButton busy={busy} className="btn danger" label="Sí, eliminar" busyLabel="Eliminando…" onClick={confirm} disabled={!!blockText} />
          </div>
        </>
      )}
    </Overlay>
  );
}

export default function Users() {
  const toast = useToast();
  const { token } = useAuth();
  const me = currentUsername(token);
  const [params] = useSearchParams();
  const vista = params.get("vista"); // nuevo | editar | eliminar

  const res = useResource(getUsers);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [vistaDone, setVistaDone] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  const all = res.data ?? [];
  const open = (m: ModalState | null) => {
    setModal(m);
    setVistaDone(true);
  };

  let shown = modal;
  if (!shown && !vistaDone && res.data && all[0]) {
    const other = all.find((u) => u.username !== me) ?? all[0];
    if (vista === "nuevo") shown = { kind: "form", editing: null };
    if (vista === "editar") shown = { kind: "form", editing: other };
    if (vista === "eliminar") shown = { kind: "delete", id: all[0]._id };
  }

  const mark = (id: string) => {
    setFresh(id);
    setTimeout(() => setFresh((f) => (f === id ? null : f)), 1900);
  };

  const base = all.filter((u) => filter === "all" || u.role === filter);
  const rows = base.filter((u) => !query || `${u.name} ${u.username}`.toLowerCase().includes(query));
  const countOf = (f: Filter) => (f === "all" ? all.length : all.filter((u) => u.role === f).length);
  const admins = all.filter((u) => u.role === "admin").length;

  const columns: Column<User>[] = [
    {
      header: "Usuario",
      width: "minmax(240px, 1.3fr)",
      cell: (u) => (
        <div className="person">
          <span className="av">{initials(u.name)}</span>
          <div className="pc"><div className="strong">{u.name}{u.username === me && " (tú)"}</div><div className="muted sm-text">{u.username}</div></div>
        </div>
      ),
    },
    { header: "Rol", width: "160px", cell: (u) => <Badge tone={u.role === "admin" ? "brand" : "info"}>{ROLES.find((r) => r.value === u.role)?.label}</Badge> },
    {
      header: "Puede entrar a",
      width: "minmax(240px, 1.2fr)",
      cell: (u) => <div className="chips">{ROLES.find((r) => r.value === u.role)?.access.map((a) => <span key={a} className="chip-s">{a}</span>)}</div>,
    },
    {
      header: "Acciones",
      width: "110px",
      num: true,
      cell: (u) => (
        <div className="acts">
          <button className="icon-btn soft" onClick={() => open({ kind: "form", editing: u })} aria-label={`Editar a ${u.name}`}><Icon name="edit" /></button>
          <button className="icon-btn soft danger" onClick={() => open({ kind: "delete", id: u._id })} aria-label={`Eliminar a ${u.name}`}><Icon name="trash" /></button>
        </div>
      ),
    },
  ];

  const target = shown?.kind === "delete" ? all.find((u) => u._id === shown.id) : undefined;
  const blockText = target
    ? target.username === me
      ? "Es tu propio usuario: no puedes eliminarlo mientras tienes la sesión abierta."
      : target.role === "admin" && admins <= 1
        ? "Es el único administrador. Crea otro antes de eliminarlo."
        : ""
    : "";

  return (
    <Page
      title="Usuarios"
      service="auth-service"
      subtitle="Quién entra al sistema y con qué rol"
      search={{ value: q, onChange: setQ, placeholder: "Nombre o usuario", label: "Buscar usuarios" }}
      actions={
        <button className="btn primary plus" onClick={() => open({ kind: "form", editing: null })}>
          <Icon name="plus" />
          Nuevo usuario
        </button>
      }
    >
      {res.status === "error" && <ErrorCard title="No pudimos cargar los usuarios" text={res.error} onRetry={res.reload} />}

      {res.status !== "error" && (
        <>
          <div className="bar-row">
            <Seg<Filter>
              label="Filtrar por rol"
              value={filter}
              onChange={setFilter}
              items={[{ key: "all", label: "Todos", count: countOf("all") }, { key: "admin", label: "Administradores", count: countOf("admin") }, { key: "recepcionista", label: "Recepción", count: countOf("recepcionista") }]}
            />
            <div className="row-btns" style={{ alignItems: "center" }}>
              <span className="muted sm-text">{query ? `${num(rows.length)} de ${num(base.length)} usuarios` : plural(base.length, "usuario", "usuarios")}</span>
              <LoadChip stats={res.stats} records={all.length} noun="usuarios" />
            </div>
          </div>
          <div className={res.refreshing ? "refreshing" : undefined}>
            <Table
              label="Usuarios"
              columns={columns}
              rows={rows}
              rowKey={(u) => u._id}
              minWidth={820}
              freshId={fresh}
              loading={res.status === "loading"}
              empty={<Empty icon="shield" title={query ? `Nada coincide con “${q.trim()}”.` : "No hay usuarios con este rol."} />}
            />
          </div>
        </>
      )}

      {shown?.kind === "form" && (
        <UserForm
          editing={shown.editing}
          onClose={() => open(null)}
          onSaved={(name, created) => {
            res.refresh();
            if (shown.editing) mark(shown.editing._id);
            open(null);
            toast(created ? `${name} ya puede iniciar sesión` : "Usuario actualizado");
          }}
        />
      )}
      {shown?.kind === "delete" && target && (
        <DeleteModal
          user={target}
          blockText={blockText}
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
