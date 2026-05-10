 import { Navigate, NavLink, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
 import { SEO } from "@/components/site/SEO";
import { 
  LayoutDashboard, 
  FileText, 
  Images, 
  MessageCircle, 
  Quote, 
  Bot, 
  GraduationCap, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/paginas", label: "Páginas", icon: FileText },
  { to: "/admin/casos", label: "Casos clínicos", icon: Images },
  { to: "/admin/faqs", label: "FAQ", icon: MessageCircle },
  { to: "/admin/depoimentos", label: "Depoimentos", icon: Quote },
  { to: "/admin/ia-opinions", label: "Opiniões de IAs", icon: Bot },
  { to: "/admin/cursos", label: "Cursos", icon: GraduationCap },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminLayout() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-brand-black text-brand-text-soft">Carregando...</div>;
  }
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

  // Se estiver no editor de página, não mostramos a sidebar principal para não conflitar com a sidebar do editor
  const isEditingPage = location.pathname.match(/\/admin\/paginas\/[^/]+$/);

  if (isEditingPage) {
    return <Outlet />;
  }

   return (
     <div className="min-h-screen flex bg-[#0A0A0A] text-brand-text-soft">
       <SEO isAdmin title="Admin" />
      {/* Sidebar Administrativa */}
      <aside 
        className={cn(
          "shrink-0 border-r border-white/5 bg-[#0F0F0F] flex flex-col transition-all duration-300 ease-in-out relative z-[60]",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header da Sidebar */}
        <div className={cn("p-5 border-b border-white/5 flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center px-2")}>
          <div className="size-9 rounded-xl bg-brand-gold flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(209,180,111,0.2)]">
            <Home className="size-5 text-brand-green" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <p className="text-[9px] uppercase tracking-[0.25em] text-brand-gold font-bold leading-none mb-1">Painel</p>
              <p className="font-display text-base text-white/90 truncate leading-none">Estética Batel</p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-8 px-4 space-y-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-brand-gold/10 text-brand-gold shadow-[inset_0_0_0_1px_rgba(209,180,111,0.1)]"
                    : "text-white hover:bg-white/[0.03]",
                  isCollapsed ? "justify-center h-12 px-0" : "px-4 py-3"
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("shrink-0 transition-transform group-hover:scale-110", isCollapsed ? "size-6" : "size-4")} strokeWidth={1.6} />
              {!isCollapsed && <span className="text-sm font-medium tracking-tight truncate">{item.label}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1.5 bg-[#1A1A1A] text-white text-[10px] rounded-lg border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-2xl">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={signOut}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/5 transition-all group relative",
              isCollapsed ? "justify-center h-12 px-0" : "px-4 py-3"
            )}
          >
            <LogOut className="size-5 shrink-0" strokeWidth={1.6} />
            {!isCollapsed && <span className="text-sm font-medium">Sair da conta</span>}
          </button>
        </div>

        {/* Botão de Colapso */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 size-6 flex items-center justify-center bg-[#1A1A1A] text-white/40 rounded-full border border-white/10 shadow-xl hover:text-brand-gold hover:border-brand-gold/30 transition-all z-50 group"
        >
          {isCollapsed ? <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" /> : <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />}
        </button>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
