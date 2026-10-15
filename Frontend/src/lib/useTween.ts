import { useEffect, useState } from "react";

// Progreso 0 → 1 (con ease-out) cada vez que cambia `key`: hace que los números del panel
// "suban" y las barras crezcan al cargar, como en el diseño. Respeta prefers-reduced-motion.
export function useTween(key: string, duration = 1100): number {
  const [state, setState] = useState({ key: "", t: 0 });

  useEffect(() => {
    if (!key) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let id = 0;
    const step = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - start) / duration);
      setState({ key, t: p });
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [key, duration]);

  return state.key === key ? 1 - Math.pow(1 - state.t, 4) : 0;
}
