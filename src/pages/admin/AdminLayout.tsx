import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, FileText, Images, MessageCircle, Quote, Bot, GraduationCap, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/paginas", label: "Páginas", icon: FileText },
  { to: "/admin/casos", label: "Casos clínicos", icon: Images },
  { to: "/admin/faqs", label: "Perguntas (FAQ)", icon: MessageCircle },
  { to: "/admin/depoimentos", label: "Depoimentos", icon: Quote },
  { to: "/admin/ia-opinions", label: "Opiniões de IAs", icon: Bot },
  { to: "/admin/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-brand-black text-brand-text-soft">Carregando...</div>;
  }
  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-brand-black text-brand-text-soft p-6 text-center">
        <div>
          <p className="font-display text-2xl mb-3">Sem permissão</p>
          <p className="text-sm mb-6">Sua conta não tem papel de administrador.</p>
          <button onClick={signOut} className="text-brand-gold underline text-sm">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-brand-black text-brand-text-soft">
      <aside className="w-60 shrink-0 border-r border-brand-gold/15 bg-brand-graphite/30 flex flex-col">
        <div className="p-5 border-b border-brand-gold/15">
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-gold">Admin</p>
          <p className="font-display text-lg text-brand-text-light mt-1">Estética Batel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors",
                  isActive
                    ? "bg-brand-gold/15 text-brand-gold"
                    : "text-brand-text-soft hover:bg-brand-gold/5 hover:text-brand-text-light",
                )
              }
            >
              <item.icon className="size-4" strokeWidth={1.6} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="m-3 mt-0 flex items-center gap-2 px-3 py-2 text-sm text-brand-text-muted hover:text-brand-text-light"
        >
          <LogOut className="size-4" strokeWidth={1.6} />
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}