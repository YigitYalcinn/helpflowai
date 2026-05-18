import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ApiResponse, Role, User } from "../types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; departmentId?: string }) => Promise<User>;
  logout: () => void;
  defaultPath: string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function pathForRole(role?: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "IT_STAFF") return "/it/dashboard";
  return "/employee/dashboard";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<User>>("/auth/me")
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem("helpflow_token"))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    defaultPath: pathForRole(user?.role),
    async login(email, password) {
      const res = await api.post<ApiResponse<{ user: User; token: string }>>("/auth/login", { email, password });
      localStorage.setItem("helpflow_token", res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    async register(payload) {
      const res = await api.post<ApiResponse<{ user: User; token: string }>>("/auth/register", payload);
      localStorage.setItem("helpflow_token", res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    logout() {
      localStorage.removeItem("helpflow_token");
      setUser(null);
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
