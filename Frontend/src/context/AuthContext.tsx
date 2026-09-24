import { createContext, type ReactNode, useContext, useState } from "react";

interface AuthContextType {
  token: string | null;
  role: string | null;
  name: string | null;
  login: (token: string, role: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {

  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const [role, setRole] = useState<string | null>(
    localStorage.getItem("role")
  );

  const [name, setName] = useState<string | null>(
    localStorage.getItem("name")
  );

  const login = (token: string, role: string, name: string) => {
    setToken(token);
    setRole(role);
    setName(name);

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("name", name);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setName(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ token, role, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}