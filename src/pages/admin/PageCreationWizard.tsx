import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  ChevronLeft, 
  Wand2, 
  Loader2, 
  Info,
  ArrowRight,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BLOCK_LABELS, type BlockType } from "@/types/blocks";
import { cn } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const ALL_BLOCKS: BlockType[] = [
  "hero",
  "authority_strip",
  "manifesto_curto",
  "metodo",
  "procedimento_detalhado_v2",
  "beneficios_grid",
  "casos",
  "preco_ancora",
  "depoimentos",
  "ai_opinions",
  "equipe_rt",
  "cursos",
  "faq",
  "cta_final"
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function PageCreationWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"details" | "content" | "blocks">("details");
  const [isGenerating, setIsGenerating] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("injetáveis");
  const [baseContent, setBaseContent] = useState("");
  const [faqBase, setFaqBase] = useState("");
  const [testimonialsBase, setTestimonialsBase] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<BlockType[]>([
    "hero", "authority_strip", "metodo", "beneficios_grid", "depoimentos", "faq", "cta_final"
  ]);

  const onNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugify(name)) setSlug(slugify(v));
  };

  const toggleBlock = (block: BlockType) => {
    setSelectedBlocks(prev => 
      prev.includes(block) 
        ? prev.filter(b => b !== block)
        : [...prev, block]
    );
  };

  const handleGenerate = async () => {
    if (!name || !slug) {
      toast({ title: "Preencha o nome e slug", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-page-premium", {
        body: { name, slug, category, baseContent, faqBase, testimonialsBase, selectedBlocks }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Página gerada!", description: "Redirecionando para o editor..." });
      setTimeout(() => navigate(`/admin/paginas/${data.slug}`), 1000);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar página", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/admin/paginas" className="text-xs text-brand-text-muted hover:text-brand-gold inline-flex items-center gap-1 mb-6 transition-colors">
        <ChevronLeft className="size-3" /> Voltar para páginas
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light flex items-center gap-3">
            <Sparkles className="size-6 text-brand-gold" /> Criador de Página Inteligente
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">Gere uma landing page completa baseada em blocos premium.</p>
        </div>
        <div className="flex gap-2">
          <div className={cn("size-2 rounded-full", step === "details" ? "bg-brand-gold" : "bg-brand-gold/20")} />
          <div className={cn("size-2 rounded-full", step === "content" ? "bg-brand-gold" : "bg-brand-gold/20")} />
          <div className={cn("size-2 rounded-full", step === "blocks" ? "bg-brand-gold" : "bg-brand-gold/20")} />
        </div>
      </div>
      <div className="space-y-6">
        {step === "details" && (
          <Card className="bg-brand-graphite/30 border-brand-gold/15">
            <CardHeader><CardTitle className="text-brand-text-light">1. Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Nome do Procedimento</Label>
                <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="Ex: Bioestimulador de Colágeno" className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-brand-text-muted text-sm shrink-0">esteticabatel.com.br/p/</span>
                  <Input value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="bioestimulador-colageno" className="bg-brand-black/50 border-brand-gold/10 text-brand-text-light" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button onClick={() => setStep("content")} disabled={!name || !slug} className="bg-brand-gold text-brand-bg px-8">
                  Próximo <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === "content" && (
          <Card className="bg-brand-graphite/30 border-brand-gold/15">
            <CardHeader><CardTitle className="text-brand-text-light">2. Base de Conhecimento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-brand-text-muted">Conteúdo Base</Label>
                <Textarea value={baseContent} onChange={e => setBaseContent(e.target.value)} className="bg-brand-black/50 border-brand-gold/10 min-h-[150px] text-brand-text-light" />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep("details")} className="text-brand-text-light">Voltar</Button>
                <Button onClick={() => setStep("blocks")} className="bg-brand-gold text-brand-bg px-8">Próximo <ArrowRight className="ml-2 size-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}
        {step === "blocks" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_BLOCKS.map(block => (
                <div key={block} onClick={() => toggleBlock(block)} className={cn("cursor-pointer border p-4", selectedBlocks.includes(block) ? "bg-brand-gold/10 border-brand-gold/40" : "bg-brand-graphite/20 border-brand-gold/10")}>
                  <div className="flex items-start justify-between">
                    <span className={cn("text-xs font-medium uppercase tracking-wider", selectedBlocks.includes(block) ? "text-brand-gold" : "text-brand-text-muted")}>{BLOCK_LABELS[block]}</span>
                    <Checkbox checked={selectedBlocks.includes(block)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 flex justify-between">
              <Button variant="ghost" onClick={() => setStep("content")} className="text-brand-text-light">Voltar</Button>
              <Button onClick={handleGenerate} disabled={isGenerating} className="bg-brand-gold text-brand-bg px-10 py-6">
                {isGenerating ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Wand2 className="mr-2 size-5" />} Gerar Landing Page
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
