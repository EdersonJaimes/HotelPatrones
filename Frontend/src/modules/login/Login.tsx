import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMsg } from "../../lib/format";
import api from "../../services/api";
import Icon from "../../ui/Icon";

// Orden en que se "encienden" las ventanas del edificio de la ilustración.
const WINDOW_ORDER = [2, 9, 5, 0, 11, 7, 3, 10, 1, 6, 8, 4];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vista = params.get("vista"); // ?vista=error | cargando: para ver esos estados del diseño

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(vista === "error" ? "Usuario o contraseña incorrectos. Revísalos e intenta de nuevo." : "");
  const [loading, setLoading] = useState(vista === "cargando");
  const [hint, setHint] = useState(false);

  const submit = async () => {
    if (loading) return;

    if (!username.trim() || !password) {
      setError("Escribe tu usuario y tu contraseña.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/login", { username: username.trim(), password });
      const { token, role, name } = res.data;
      login(token, role, name);
      navigate(role === "admin" ? "/dashboard" : "/reception");
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? "Usuario o contraseña incorrectos. Revísalos e intenta de nuevo." : errMsg(e, "No se pudo iniciar sesión."));
      setLoading(false);
    }
  };

  const bad = error ? " bad" : "";

  return (
    <div className="lg">
      <section className="lg-art" aria-label="Hotel Patrones">
        <div className="lg-brand">
          <div className="lg-mark" aria-hidden="true">H</div>
          <div className="lg-brand-name">Hotel Patrones</div>
        </div>
        <div>
          <h1>Cada habitación, a un clic.</h1>
          <p>Recepción, reservas, inventario y clientes en un solo lugar, conectados en tiempo real.</p>
        </div>
        <div className="lg-bld" aria-hidden="true">
          <div className="lg-bld-body">
            {WINDOW_ORDER.map((o) => (
              <div key={o} className="lg-w" style={{ ["--d" as string]: o * 600 }} />
            ))}
            <div className="lg-door" />
          </div>
        </div>
      </section>

      <section className="lg-side">
        <form
          className="lg-card"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <h2>Inicia sesión</h2>
            <div className="lg-muted">Entra con el usuario que te dio el administrador.</div>
          </div>

          {error && (
            <div className="lg-alert" role="alert">
              <Icon name="alert" className="lg-ic" />
              {error}
            </div>
          )}

          <div className="lg-fld">
            <label className="lg-lbl" htmlFor="lg-user">Usuario</label>
            <div className={"lg-box" + bad}>
              <Icon name="user" className="lg-ic" />
              <input id="lg-user" type="text" placeholder="Tu usuario" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>

          <div className="lg-fld">
            <label className="lg-lbl" htmlFor="lg-pass">Contraseña</label>
            <div className={"lg-box" + bad}>
              <Icon name="lock" className="lg-ic" />
              <input id="lg-pass" type={show ? "text" : "password"} placeholder="Tu contraseña" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="lg-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <Icon name={show ? "eyeOff" : "eye"} className="lg-ic" />
              </button>
            </div>
          </div>

          <div className="lg-row">
            <label className="lg-check"><input type="checkbox" />Recordarme</label>
            <a href="#" onClick={(e) => { e.preventDefault(); setHint(true); }}>¿Olvidaste tu contraseña?</a>
          </div>
          {hint && <div className="lg-foot">Pídele al administrador que cambie tu contraseña desde la sección Usuarios.</div>}

          <button type="submit" className={"lg-btn" + (loading ? " lg-busy" : "")} disabled={loading}>
            {loading ? (
              <>
                <span className="lg-spin" aria-hidden="true" />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <Icon name="arrow" className="lg-ic lg-arr" />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
