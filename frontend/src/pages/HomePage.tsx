import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function HomePage() {
  const { user, defaultPath } = useAuth();
  return <Navigate to={user ? defaultPath : "/login"} replace />;
}
