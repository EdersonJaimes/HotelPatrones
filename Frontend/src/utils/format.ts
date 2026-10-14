// $ 1.234.567 (pesos colombianos, sin decimales)
export const formatMoney = (value: number): string =>
  "$" + Math.round(Number(value) || 0).toLocaleString("es-CO");

export const formatDateTime = (value?: string | Date): string =>
  value
    ? new Date(value).toLocaleString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

// Los nombres de producto/cliente vienen de la base de datos y se insertan
// en el HTML de SweetAlert: se escapan para que nunca se interpreten como HTML.
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
