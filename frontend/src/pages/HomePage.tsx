import { Navigate } from "react-router-dom";
import { PageLoader } from "../components/ui/States";
import { useAuth } from "../contexts/AuthContext";

export function HomePage() {
  const { user, loading, defaultPath } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><PageLoader /></div>;
  return <Navigate to={user ? defaultPath : "/login"} replace />;
}
