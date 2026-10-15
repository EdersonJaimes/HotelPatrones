import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

interface OverlayProps {
  kind?: "modal" | "drawer";
  size?: "sm" | "md";
  label: string;
  // Se llama cuando termina la animación de cierre: ahí el padre limpia su estado.
  onClose: () => void;
  shake?: boolean;
  children: (close: () => void) => ReactNode;
}

/**
 * Modal centrado o panel lateral del diseño, con animación de salida y cierre con Escape.
 * Los hijos reciben `close` para que sus botones "Cancelar" también animen.
 */
export default function Overlay({ kind = "modal", size = "md", label, onClose, shake, children }: OverlayProps) {
  const [closing, setClosing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Siempre la versión más reciente de onClose (el padre suele pasar una función nueva en cada render).
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => onCloseRef.current(), reduce ? 0 : 250);
    return () => window.clearTimeout(id);
  }, [closing]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosing(true);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);

  const close = () => setClosing(true);
  const box = kind === "drawer" ? "drawer" : "modal" + (size === "sm" ? " sm" : "") + (shake ? " shake-a" : "");

  // Se pinta dentro de la raíz .hp (conserva los colores del tema) pero fuera del contenido de la
  // pantalla: así queda por encima del menú lateral y de la barra superior, que son "sticky".
  const host = document.querySelector(".hp") ?? document.body;

  return createPortal(
    <div className={"ovl" + (kind === "drawer" ? " right" : "") + (closing ? " closing" : "")}>
      <button className="scrim" onClick={close} aria-label="Cerrar" tabIndex={-1} />
      <div className={box} role="dialog" aria-modal="true" aria-label={label} ref={boxRef} tabIndex={-1}>
        {children(close)}
      </div>
    </div>,
    host
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="icon-btn soft" onClick={onClick} aria-label="Cerrar">
      <Icon name="x" />
    </button>
  );
}
