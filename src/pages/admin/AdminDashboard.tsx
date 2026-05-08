import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Images, 
  MessageCircle, 
  Quote, 
  LayoutDashboard, 
  GraduationCap, 
  Bot, 
  Settings,
  Plus,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [pages, cases, faqs, reviews] = await Promise.all([
        supabase.from("pages").select("*", { count: "exact", head: true }),
        supabase.from("cases").select("*", { count: "exact", head: true }),
        supabase.from("faqs").select("*", { count: "exact", head: true }),
        supabase.from("reviews").select("*", { count: "exact", head: true }),
      ]);
      return {
        pages: pages.count ?? 0,
        cases: cases.count ?? 0,
        faqs: faqs.count ?? 0,
        reviews: reviews.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Páginas", value: counts?.pages ?? "—", icon: FileText, to: "/admin/paginas", color: "text-blue-400" },
    { label: "Casos clínicos", value: counts?.cases ?? "—", icon: Images, to: "/admin/casos", color: "text-brand-gold" },
    { label: "FAQs", value: counts?.faqs ?? "—", icon: MessageCircle, to: "/admin/faqs", color: "text-green-400" },
    { label: "Depoimentos", value: counts?.reviews ?? "—", icon: Quote, to: "/admin/depoimentos", color: "text-purple-400" },
  ];

  const quickActions = [
    { label: "Nova Página", description: "Criar do zero ou com IA", icon: Plus, to: "/admin/paginas/nova", primary: true },
    { label: "Novo Caso Clínico", description: "Upload de antes e depois", icon: Images, to: "/admin/casos" },
    { label: "Configurações", description: "Ajustes globais do CRM", icon: Settings, to: "/admin/configuracoes" },
  ];

  return (
    <div className="min-h-full bg-[#0A0A0A] p-6 lg:p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="size-4 text-brand-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold/60">CRM de Estética</span>
          </div>
          <h1 className="font-display text-4xl text-white tracking-tight">Bem-vindo, Doutor(a)</h1>
          <p className="text-white/40 text-sm mt-2 max-w-md">Aqui você gerencia o conteúdo de autoridade do site da Estética Batel.</p>
        </div>
        
        <Button asChild className="bg-brand-gold text-brand-green hover:bg-brand-gold/90 rounded-xl px-6 h-12 font-bold shadow-[0_0_25px_rgba(209,180,111,0.2)]">
          <Link to="/admin/paginas/nova">
            <Plus className="size-5 mr-2" strokeWidth={3} />
            Criar Nova Página
          </Link>
        </Button>
      </header>

      {/* s Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 p-6 hover:border-brand-gold/30 hover:bg-white/[0.02] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                <c.icon className="size-5 text-white/40 group-hover:text-brand-gold transition-colors" strokeWidth={1.6} />
              </div>
              <ArrowRight className="size-4 text-white/10 group-hover:text-brand-gold transition-all group-hover:translate-x-1" />
            </div>
            <p className="text-3xl font-display text-white mb-1 group-hover:text-brand-gold transition-colors">{c.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 group-hover:text-white/50 transition-colors">{c.label}</p>
          </Link>
        ))}
      </section>

      {/* Main Grid: Tools and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <section className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
            <div className="h-px w-6 bg-white/10" />
            Ações Rápidas
          </h2>
          <div className="grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#0F0F0F] border border-white/5 hover:border-brand-gold/20 hover:bg-white/[0.03] transition-all group"
              >
                <div className="size-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-brand-gold group-hover:text-brand-green transition-all">
                  <action.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/90 group-hover:text-brand-gold transition-colors">{action.label}</p>
                  <p className="text-[11px] text-white/30">{action.description}</p>
                </div>
              </Link>
            ))} 
          </div>
        </section>

        {/* Shortcuts Section */}
        <section className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-6 flex items-center gap-2">
            <div className="h-px w-6 bg-white/10" />
            Outras Ferramentas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/admin/cursos" className="p-6 rounded-3xl bg-gradient-to-br from-[#111] to-[#0F0F0F] border border-white/5 hover:border-blue-500/20 transition-all group flex flex-col justify-between h-48">
              <GraduationCap className="size-8 text-blue-400 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              <div>
                <h3 className="text-lg font-bold text-white/90">Área de Cursos</h3>
                <p className="text-xs text-white/30 mt-1">Gerencie aulas e material para alunos da clínica.</p>
              </div>
            </Link>
            <Link to="/admin/ia-opinions" className="p-6 rounded-3xl bg-gradient-to-br from-[#111] to-[#0F0F0F] border border-white/5 hover:border-purple-500/20 transition-all group flex flex-col justify-between h-48">
              <Bot className="size-8 text-purple-400 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              <div>
                <h3 className="text-lg font-bold text-white/90">Curadoria de IA</h3>
                <p className="text-xs text-white/30 mt-1">Configure as respostas automáticas e opiniões do robô.</p>
              </div>
            </Link> 
          </div>
        </section> 
      </div>
    </div>
  );
}
