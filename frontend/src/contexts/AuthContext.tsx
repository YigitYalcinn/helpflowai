import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, TOKEN_KEY, UNAUTHORIZED_EVENT } from "../lib/api";
import { ApiResponse, Role, User } from "../types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; departmentId?: string }) => Promise<User>;
  logout: () => void;
  defaultPath: string;
  /** URL prefix of the signed-in role's pages: /employee, /it or /admin. */
  basePath: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function basePathForRole(role?: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "IT_STAFF") return "/it";
  return "/employee";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    api
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const basePath = basePathForRole(user?.role);
    const startSession = (data: { user: User; token: string }) => {
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      return data.user;
    };

    return {
      user,
      loading,
      basePath,
      defaultPath: `${basePath}/dashboard`,
      async login(email, password) {
        const res = await api.post<ApiResponse<{ user: User; token: string }>>("/auth/login", { email, password });
        return startSession(res.data.data);
      },
      async register(payload) {
        const res = await api.post<ApiResponse<{ user: User; token: string }>>("/auth/register", payload);
        return startSession(res.data.data);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
    };
  }, [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
