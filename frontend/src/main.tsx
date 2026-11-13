import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./index.css";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { PageLoader } from "./components/ui/States";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import { NotFoundPage } from "./pages/NotFoundPage";

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

// Lazy pages suspend inside the layout, so the sidebar stays put while a page loads.
const shell = (
  <AppLayout fallback={<PageLoader />} />
);

const router = createBrowserRouter([
  {
    errorElement: <NotFoundPage crashed />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      {
        element: <ProtectedRoute roles={["EMPLOYEE"]} />,
        children: [{ element: shell, children: [
          { path: "/employee/dashboard", element: <DashboardPage /> },
          { path: "/employee/tickets", element: <TicketsPage /> },
          { path: "/employee/tickets/new", element: <NewTicketPage /> },
          { path: "/employee/tickets/:id", element: <TicketDetailPage /> }
        ] }]
      },
      {
        element: <ProtectedRoute roles={["IT_STAFF"]} />,
        children: [{ element: shell, children: [
          { path: "/it/dashboard", element: <DashboardPage /> },
          { path: "/it/tickets", element: <TicketsPage /> },
          { path: "/it/tickets/assigned", element: <TicketsPage assignedOnly /> },
          { path: "/it/tickets/:id", element: <TicketDetailPage /> },
          { path: "/it/reports", element: <ReportsPage /> }
        ] }]
      },
      {
        element: <ProtectedRoute roles={["ADMIN"]} />,
        children: [{ element: shell, children: [
          { path: "/admin/dashboard", element: <DashboardPage /> },
          { path: "/admin/users", element: <AdminUsersPage /> },
          { path: "/admin/departments", element: <AdminResourcePage type="departments" /> },
          { path: "/admin/support-units", element: <AdminResourcePage type="support-units" /> },
          { path: "/admin/categories", element: <AdminResourcePage type="categories" /> },
          { path: "/admin/tickets", element: <TicketsPage /> },
          { path: "/admin/tickets/:id", element: <TicketDetailPage /> },
          { path: "/admin/reports", element: <ReportsPage /> }
        ] }]
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<div className="grid min-h-screen place-items-center"><PageLoader /></div>}>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
