import { BarChart3, Building2, FolderKanban, LayoutDashboard, LifeBuoy, LogOut, Menu, MessageSquarePlus, Settings, Ticket, Users, X } from "lucide-react";
import { ReactNode, Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { roleLabels } from "../../lib/format";
import { cn } from "../../lib/utils";

const nav = {
  EMPLOYEE: [
    { to: "/employee/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { to: "/employee/tickets", label: "Taleplerim", icon: Ticket },
    { to: "/employee/tickets/new", label: "Yeni Talep", icon: MessageSquarePlus }
  ],
  IT_STAFF: [
    { to: "/it/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { to: "/it/tickets", label: "Ekip Talepleri", icon: Ticket },
    { to: "/it/tickets/assigned", label: "Üzerimdeki Talepler", icon: FolderKanban },
    { to: "/it/reports", label: "Raporlar", icon: BarChart3 }
  ],
  ADMIN: [
    { to: "/admin/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { to: "/admin/tickets", label: "Talepler", icon: Ticket },
    { to: "/admin/reports", label: "Raporlar", icon: BarChart3 },
    { to: "/admin/users", label: "Kullanıcılar", icon: Users },
    { to: "/admin/departments", label: "Departmanlar", icon: Building2 },
    { to: "/admin/support-units", label: "Destek Ekipleri", icon: Settings },
    { to: "/admin/categories", label: "Kategoriler", icon: FolderKanban }
  ]
};

// Routes whose path is a prefix of a sibling ("/tickets" vs "/tickets/new") must match exactly.
const exactRoutes = new Set(["/employee/tickets", "/it/tickets"]);

export function AppLayout({ fallback = null }: { fallback?: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = user ? nav[user.role] : [];

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const sidebar = (
    <>
      <Link to="/" className="flex items-center gap-3 px-2 font-display text-lg font-bold text-white">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-signal-400 text-ink-950"><LifeBuoy size={20} /></span>
        HelpFlow AI
      </Link>
      <nav className="mt-8 space-y-1" aria-label="Ana menü">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={exactRoutes.has(item.to)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-medium text-brand-100/80 hover:bg-white/5 hover:text-white",
                isActive && "border-signal-400 bg-white/10 text-white hover:bg-white/10"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 bg-ink-900 px-4 py-5 lg:block">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat" />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-ink-900 px-4 py-5 shadow-soft">
            <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-5 rounded-lg p-2 text-brand-100 hover:bg-white/10" aria-label="Menüyü kapat">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-paper/90 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Menüyü aç" aria-expanded={menuOpen}>
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">
                {user ? roleLabels[user.role] : ""}
                {user?.supportUnit?.name ? ` · ${user.supportUnit.name}` : user?.department?.name ? ` · ${user.department.name}` : ""}
              </p>
            </div>
          </div>
          <button onClick={logout} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <LogOut size={16} />
            Çıkış
          </button>
        </header>
        <main className="px-4 py-6 lg:px-8">
          <Suspense fallback={fallback}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
