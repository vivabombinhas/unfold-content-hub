import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ProcedureDocument = Database["public"]["Tables"]["procedure_documents"]["Row"];
type AdminProcedureDocument = ProcedureDocument & {
  pages: { title: string | null; slug: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  approved: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  published: "bg-green-500/10 text-green-400 border-green-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  reviewed: "Revisado",
  approved: "Aprovado",
  published: "Publicado",
};

export default function AdminDocuments() {
  const [search, setSearch] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["admin-all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_documents")
        .select(`
          *,
          pages (
            title,
            slug
          )
        `)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as AdminProcedureDocument[];
    },
  });

  const filteredDocs = documents?.filter(doc => 
    doc.pages?.title?.toLowerCase().includes(search.toLowerCase()) ||
    doc.title?.toLowerCase().includes(search.toLowerCase())
  );

  const getDocumentHref = (doc: AdminProcedureDocument) => {
    const urlType = doc.document_type === "tcle" ? "tcle" : "diferenciais";
    return `/documentos/${urlType}/${doc.slug}${doc.status === "published" ? "" : "?preview=1"}`;
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto bg-[#0A0A0A] min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="size-4 text-brand-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold/60">Compliance & Legal</span>
          </div>
          <h1 className="font-display text-4xl text-white tracking-tight">Central de Documentos</h1>
          <p className="text-white/40 text-sm mt-2">Gestão de TCLEs e Diferenciais Técnicos de todos os procedimentos.</p>
        </div>
      </header>

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20 group-focus-within:text-brand-gold transition-colors" />
        <Input
          placeholder="Buscar por procedimento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 bg-[#0F0F0F] border-white/5 text-white h-12 rounded-2xl focus:border-brand-gold/30 transition-all"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs?.map((doc) => (
            <div 
              key={doc.id}
              className="group relative overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 p-6 hover:border-brand-gold/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                  <FileText className="size-5 text-brand-gold" />
                </div>
                <Badge variant="outline" className={cn("uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-full", STATUS_COLORS[doc.status])}>
                  {STATUS_LABELS[doc.status]}
                </Badge>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-white font-medium line-clamp-1 group-hover:text-brand-gold transition-colors">
                  {doc.document_type === 'tcle' ? 'TCLE' : 'Diferenciais'}: {doc.pages?.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <Clock className="size-3" />
                  <span>Atualizado em {new Date(doc.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5 rounded-xl h-9 text-xs"
                >
                  <Link to={`/admin/paginas/${doc.pages?.slug}`}>
                    Gerenciar no Editor
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="ghost" 
                  size="icon" 
                  className="size-9 rounded-xl text-white/20 hover:text-brand-gold hover:bg-brand-gold/10"
                >
                  <a href={getDocumentHref(doc)} target="_blank" rel="noreferrer" title={doc.status === "published" ? "Ver documento público" : "Ver prévia autenticada"}>
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}

          {filteredDocs?.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <FileText className="size-12 text-white/5 mx-auto mb-4" />
              <p className="text-white/40">Nenhum documento encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
