import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Images, MessageCircle, Quote } from "lucide-react";

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

  const cards = [
    { label: "Páginas", value: counts?.pages ?? "—", icon: FileText, to: "/admin/paginas" },
    { label: "Casos clínicos", value: counts?.cases ?? "—", icon: Images, to: "/admin/casos" },
    { label: "FAQs", value: counts?.faqs ?? "—", icon: MessageCircle, to: "/admin/faqs" },
    { label: "Depoimentos", value: counts?.reviews ?? "—", icon: Quote, to: "/admin/depoimentos" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-3xl text-brand-text-light">Dashboard</h1>
      <p className="text-sm text-brand-text-muted mt-1">Visão geral do conteúdo do site.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="border border-brand-gold/15 bg-brand-graphite/30 p-5 hover:border-brand-gold/40 transition-colors"
          >
            <c.icon className="size-5 text-brand-gold" strokeWidth={1.4} />
            <p className="font-display text-3xl text-brand-text-light mt-3">{c.value}</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-text-muted mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}