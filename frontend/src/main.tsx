import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const TicketsPage = lazy(() => import("./pages/TicketsPage").then((module) => ({ default: module.TicketsPage })));
const TicketDetailPage = lazy(() => import("./pages/TicketDetailPage").then((module) => ({ default: module.TicketDetailPage })));
const NewTicketPage = lazy(() => import("./pages/employee/NewTicketPage").then((module) => ({ default: module.NewTicketPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })));
const AdminResourcePage = lazy(() => import("./pages/admin/AdminResourcePage").then((module) => ({ default: module.AdminResourcePage })));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage").then((module) => ({ default: module.ReportsPage })));

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute roles={["EMPLOYEE"]} />,
    children: [{ element: <AppLayout />, children: [
      { path: "/employee/dashboard", element: <DashboardPage scope="employee" /> },
      { path: "/employee/tickets", element: <TicketsPage /> },
      { path: "/employee/tickets/new", element: <NewTicketPage /> },
      { path: "/employee/tickets/:id", element: <TicketDetailPage /> }
    ] }]
  },
  {
    element: <ProtectedRoute roles={["IT_STAFF"]} />,
    children: [{ element: <AppLayout />, children: [
      { path: "/it/dashboard", element: <DashboardPage scope="it" /> },
      { path: "/it/tickets", element: <TicketsPage /> },
      { path: "/it/tickets/assigned", element: <TicketsPage assignedOnly /> },
      { path: "/it/tickets/:id", element: <TicketDetailPage /> }
    ] }]
  },
  {
    element: <ProtectedRoute roles={["ADMIN"]} />,
    children: [{ element: <AppLayout />, children: [
      { path: "/admin/dashboard", element: <DashboardPage scope="admin" /> },
      { path: "/admin/users", element: <AdminUsersPage /> },
      { path: "/admin/departments", element: <AdminResourcePage type="departments" /> },
      { path: "/admin/support-units", element: <AdminResourcePage type="support-units" /> },
      { path: "/admin/categories", element: <AdminResourcePage type="categories" /> },
      { path: "/admin/tickets", element: <TicketsPage /> },
      { path: "/admin/tickets/:id", element: <TicketDetailPage /> },
      { path: "/admin/reports", element: <ReportsPage /> }
    ] }]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-slate-600">Yukleniyor...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  </React.StrictMode>
);
