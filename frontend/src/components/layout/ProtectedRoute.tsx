import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Role } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { PageLoader } from "../ui/States";

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="grid min-h-screen place-items-center"><PageLoader /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
