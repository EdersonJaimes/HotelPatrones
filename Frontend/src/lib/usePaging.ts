import { useState } from "react";

// Paginación en el navegador: con miles de filas, filtrar es instantáneo; pintarlas todas no.
export function usePaging<T>(rows: T[], resetKey: string, initialSize = 20) {
  const [state, setState] = useState({ page: 0, size: initialSize, key: resetKey });
  const page = state.key === resetKey ? state.page : 0;
  const pages = Math.max(1, Math.ceil(rows.length / state.size));
  const safe = Math.min(page, pages - 1);

  return {
    page: safe,
    pages,
    size: state.size,
    total: rows.length,
    slice: rows.slice(safe * state.size, safe * state.size + state.size),
    setPage: (p: number) => setState({ ...state, page: Math.max(0, Math.min(pages - 1, p)), key: resetKey }),
    setSize: (size: number) => setState({ page: 0, size, key: resetKey }),
  };
}

export type Paging = ReturnType<typeof usePaging>;

