import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Eye, 
  CheckCircle2, 
  Clipboard, 
  ExternalLink,
  Edit,
  History
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ProcedureDocumentsTabProps {
  pageId: string;
  slug: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  reviewed: "Revisado",
  approved: "Aprovado",
  published: "Publicado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  reviewed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  approved: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  published: "bg-green-500/10 text-green-400 border-green-500/20",
};

export function ProcedureDocumentsTab({ pageId, slug }: ProcedureDocumentsTabProps) {
  const qc = useQueryClient();
  const [editingDoc, setEditingDoc] = useState<any>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["procedure-documents", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedure_documents")
        .select("*")
        .eq("page_id", pageId);
      if (error) throw error;
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (documentType: "tcle" | "technical_differential") => {
      const { data, error } = await supabase.functions.invoke("generate-procedure-document", {
        body: { page_id: pageId, document_type: documentType },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedure-documents", pageId] });
      toast({ title: "Documento gerado com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao gerar documento", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from("procedure_documents")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["procedure-documents", pageId] });
      setEditingDoc(null);
      toast({ title: "Documento atualizado" });
    },
  });

  const copyLink = (type: string, docSlug: string) => {
    const urlType = type === "tcle" ? "tcle" : "diferenciais";
    const url = `${window.location.origin}/documentos/${urlType}/${docSlug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };


  const tcle = documents?.find(d => d.document_type === "tcle");
  const tech = documents?.find(d => d.document_type === "technical_differential");

  const renderDocCard = (type: "tcle" | "technical_differential", doc: any) => {
    const label = type === "tcle" ? "TCLE" : "Diferenciais Técnicos";
    
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 text-brand-gold">
              <FileText className="size-5" />
            </div>
            <div>
              <h4 className="text-white font-medium">{label}</h4>
              <p className="text-xs text-white/40">
                {doc ? `Última atualização: ${new Date(doc.updated_at).toLocaleDateString()}` : "Não gerado ainda"}
              </p>
            </div>
          </div>
          {doc && (
            <Badge variant="outline" className={cn("uppercase text-[10px] tracking-widest", STATUS_COLORS[doc.status])}>
              {STATUS_LABELS[doc.status]}
            </Badge>
          )}
        </div>

        {doc ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white/80 h-8 text-xs" onClick={() => setEditingDoc(doc)}>
              <Edit className="size-3.5 mr-2" /> Editar HTML
            </Button>
            
            {doc.status === "draft" && (
              <Button variant="outline" size="sm" className="bg-blue-500/10 border-blue-500/20 text-blue-400 h-8 text-xs" onClick={() => updateMutation.mutate({ id: doc.id, status: "reviewed", reviewed_at: new Date().toISOString() })}>
                <CheckCircle2 className="size-3.5 mr-2" /> Marcar Revisado
              </Button>
            )}
            
            {doc.status === "reviewed" && (
              <Button variant="outline" size="sm" className="bg-purple-500/10 border-purple-500/20 text-purple-400 h-8 text-xs" onClick={() => updateMutation.mutate({ id: doc.id, status: "approved", approved_at: new Date().toISOString() })}>
                <CheckCircle2 className="size-3.5 mr-2" /> Aprovar
              </Button>
            )}

            {doc.status === "approved" && (
              <Button size="sm" className="bg-brand-gold text-brand-green h-8 text-xs" onClick={() => updateMutation.mutate({ id: doc.id, status: "published", published_at: new Date().toISOString() })}>
                <ExternalLink className="size-3.5 mr-2" /> Publicar
              </Button>
            )}

            {doc.status === "published" && (
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white/80 h-8 text-xs" onClick={() => copyLink(type, doc.slug)}>
                <Clipboard className="size-3.5 mr-2" /> Link
              </Button>
            )}

            <Button variant="ghost" size="sm" className="h-8 text-xs text-white/40 hover:text-white" asChild>
              <a href={`/documentos/${type === 'tcle' ? 'tcle' : 'diferenciais'}/${doc.slug}`} target="_blank" rel="noreferrer">
                <Eye className="size-3.5 mr-2" /> Ver Público
              </a>
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full bg-brand-gold text-brand-green hover:bg-brand-gold/90 h-10 text-xs font-semibold uppercase tracking-wider" 
            onClick={() => generateMutation.mutate(type)}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
            Gerar com IA
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
          <FileText className="size-4 text-brand-gold" />
        </div>
        <div>
          <h3 className="text-white font-medium">Documentos do Procedimento</h3>
          <p className="text-xs text-white/40">Gere e gerencie a documentação técnica e legal.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderDocCard("tcle", tcle)}
        {renderDocCard("technical_differential", tech)}
      </div>

      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="max-w-4xl bg-brand-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar {editingDoc?.title}</DialogTitle>
            <DialogDescription className="text-white/40">
              Edite o conteúdo HTML diretamente. Use tags standard como &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              value={editingDoc?.html_content || ""} 
              onChange={(e) => setEditingDoc({ ...editingDoc, html_content: e.target.value })}
              className="min-h-[500px] bg-white/5 border-white/10 font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingDoc(null)}>Cancelar</Button>
            <Button 
              className="bg-brand-gold text-brand-green" 
              onClick={() => updateMutation.mutate({ id: editingDoc.id, html_content: editingDoc.html_content, status: "draft" })}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

