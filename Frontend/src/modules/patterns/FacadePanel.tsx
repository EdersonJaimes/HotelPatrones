import { useMemo, useState } from "react";
import { kb, ms as fmtMs } from "../../lib/format";
import { useResource } from "../../lib/useResource";
import { getStatsDirect, getStatsFacade, type DashboardMode } from "../../services/dashboardService";
import FacadeLab from "./FacadeLab";

export default function FacadePanel() {
  const [mode, setMode] = useState<DashboardMode>("facade");
  const [rtt, setRtt] = useState(0);

  // La función de carga cambia con el modo o la latencia: useResource vuelve a pedir y mide de nuevo.
  const load = useMemo(() => () => (mode === "facade" ? getStatsFacade(rtt) : getStatsDirect(rtt)), [mode, rtt]);
  const res = useResource(load);
  const result = res.data;

  return (
    <div className="stack">
      <FacadeLab
        mode={mode}
        onMode={setMode}
        rtt={rtt}
        onRtt={setRtt}
        result={result}
        loading={res.status === "loading" || res.refreshing}
        onRerun={res.refresh}
      />

      {result && (
        <section className="card lab rise" aria-label="Datos recibidos">
          <div>
            <h3 className="h3">Datos que llegaron al navegador</h3>
            <div className="muted sm-text">
              {mode === "facade"
                ? "El gateway ya hizo el trabajo: el navegador recibió un solo JSON con el resumen del Panel."
                : "El navegador descargó las listas completas de cada servicio y tuvo que combinarlas él mismo para obtener el mismo resumen."}
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="tbl-simple">
              <thead>
                <tr><th>Petición</th><th>Estado</th><th>Tiempo</th><th>Tamaño</th></tr>
              </thead>
              <tbody>
                {result.entries.map((e) => (
                  <tr key={e.id}>
                    <td><code>{e.method} {e.url}</code></td>
                    <td>{e.status}</td>
                    <td className="num">{fmtMs(e.ms)}</td>
                    <td className="num">{kb(e.bytes)}</td>
                  </tr>
                ))}
                <tr className="tbl-total">
                  <td className="strong">Total</td>
                  <td />
                  <td className="num strong">{fmtMs(result.ms)}</td>
                  <td className="num strong">{kb(result.bytes)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <details className="json-box">
            <summary>Ver el resumen que usa el Panel (JSON)</summary>
            <pre>{JSON.stringify(result.stats, null, 2).slice(0, 4000)}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
