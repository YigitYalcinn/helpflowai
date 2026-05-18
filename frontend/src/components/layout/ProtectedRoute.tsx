import { Navigate, Outlet } from "react-router-dom";
import { Role } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
