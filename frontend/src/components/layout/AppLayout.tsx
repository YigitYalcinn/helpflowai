import { BarChart3, Building2, FolderKanban, Home, LayoutDashboard, LogOut, MessageSquarePlus, Settings, Ticket, Users } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const nav = {
  EMPLOYEE: [
    { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/employee/tickets", label: "Taleplerim", icon: Ticket },
    { to: "/employee/tickets/new", label: "Yeni Talep", icon: MessageSquarePlus }
  ],
  IT_STAFF: [
    { to: "/it/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/it/tickets", label: "Ekip Talepleri", icon: Ticket },
    { to: "/it/tickets/assigned", label: "Üzerimdeki Talepler", icon: FolderKanban }
  ],
  ADMIN: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/tickets", label: "Talepler", icon: Ticket },
    { to: "/admin/users", label: "Kullanıcılar", icon: Users },
    { to: "/admin/departments", label: "Departmanlar", icon: Building2 },
    { to: "/admin/support-units", label: "Destek Ekipleri", icon: Settings },
    { to: "/admin/categories", label: "Kategoriler", icon: FolderKanban },
    { to: "/admin/reports", label: "Raporlar", icon: BarChart3 }
  ]
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const links = user ? nav[user.role] : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <Link to="/" className="flex items-center gap-3 px-2 text-lg font-bold text-slate-950">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white"><Home size={20} /></span>
          HelpFlow AI
        </Link>
        <nav className="mt-8 space-y-1">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100", isActive && "bg-brand-50 text-brand-700")
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role} {user?.supportUnit?.name ? `· ${user.supportUnit.name}` : ""}</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <LogOut size={16} />
            Çıkış
          </button>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
