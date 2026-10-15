import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ThemeValue {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
  } catch {
    /* sin almacenamiento: se usa la preferencia del sistema */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// Raíz visual de toda la app: aquí viven las variables de color del diseño (.hp / .hp.dark).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.body.classList.toggle("is-dark", dark);
  }, [dark]);

  const toggle = () => {
    setDark((d) => {
      try {
        localStorage.setItem("theme", d ? "light" : "dark");
      } catch {
        /* no pasa nada si no se puede recordar */
      }
      return !d;
    });
  };

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div className={"hp" + (dark ? " dark" : "")}>{children}</div>
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
