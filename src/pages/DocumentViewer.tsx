import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Loader2, AlertCircle } from "lucide-react";

export default function DocumentViewer() {
  const { type, slug } = useParams();

  const { data: document, isLoading, error } = useQuery({
    queryKey: ["public-document", type, slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_documents")
        .select("*, pages(title, metadata)")
        .eq("document_type", type as "tcle" | "technical_differential")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-center p-10">
        <Loader2 className="w-12 h-12 text-brand-gold animate-spin mb-4" />
        <p className="text-brand-text-light font-display text-xl tracking-widest animate-pulse">Carregando documento...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-text-light flex flex-col items-center justify-center gap-6 px-6 text-center">
        <AlertCircle className="size-20 text-brand-gold/40" />
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-brand-gold">Documento não encontrado</h1>
          <p className="text-brand-text-soft text-base max-w-md mx-auto">
            Este documento ainda não foi publicado ou o link está incorreto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-brand-black min-h-screen">
      <SEO 
        title={document.title} 
        description={`Documentação técnica da Estética Batel para ${document.pages?.title}`} 
      />
      
      <div className="max-w-3xl mx-auto py-20 px-8">
        <header className="mb-12 border-b border-gray-100 pb-8">
          <div className="flex items-center gap-3 mb-6">
             <img src="/logo.png" alt="Estética Batel" className="h-8 grayscale brightness-0" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest">
            {document.document_type === "tcle" ? "Termo de Consentimento" : "Diferenciais Técnicos"}
          </p>
        </header>

        <article 
          className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-p:text-gray-600 prose-li:text-gray-600"
          dangerouslySetInnerHTML={{ __html: document.html_content }} 
        />

        <footer className="mt-20 pt-10 border-t border-gray-100 text-sm text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Responsável Técnica</h4>
              <p>Dra. Daniele Florêncio</p>
              <p>Biomédica · CRBM 8242-PR</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Revisão e Controle</h4>
              <p>Última revisão: {new Date(document.updated_at).toLocaleDateString("pt-BR")}</p>
              <p>Status: {document.status.toUpperCase()}</p>
            </div>
          </div>
          <div className="mt-10 text-[10px] text-gray-300 uppercase tracking-widest">
            Estética Batel · Clínica de Alta Performance · Curitiba/PR
          </div>
        </footer>
      </div>
    </div>
  );
}
