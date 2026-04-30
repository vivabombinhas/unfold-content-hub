import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Search, Wand2, Loader2, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Step = "form" | "researching" | "generating" | "done" | "error";

interface ResearchData {
  duvidas: string[];
  objecoes: string[];
  termos: string[];
  angulos: string[];
  publico_alvo: string;
  area_anatomica: string;
}

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

export default function NewPageFromTopic() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tema, setTema] = useState("");
  const [slug, setSlug] = useState("");
  const [linksRaw, setLinksRaw] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [sources, setSources] = useState<{ url: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onTemaChange = (v: string) => {
    setTema(v);
    if (!slug || slug === slugify(tema)) setSlug(slugify(v));
  };

  const handleStart = async () => {
    setError(null);
    if (tema.trim().length < 3) {
      toast({ title: "Tema muito curto", variant: "destructive" });
      return;
    }
    if (slug.length < 3) {
      toast({ title: "Slug inválido", variant: "destructive" });
      return;
    }

    const links = linksRaw
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s));

    try {
      // Step 1: research
      setStep("researching");
      const { data: researchData, error: researchErr } = await supabase.functions.invoke("research-topic", {
        body: { tema, links_referencia: links },
      });
      if (researchErr) throw new Error(researchErr.message);
      if (researchData?.error) throw new Error(researchData.error);
      setResearch(researchData.research);
      setSources(researchData.sources || []);

      // Step 2: generate
      setStep("generating");
      const { data: pageData, error: pageErr } = await supabase.functions.invoke("generate-page-from-topic", {
        body: {
          tema,
          slug,
          research: researchData.research,
          links_referencia: links,
          sources: researchData.sources || [],
          ai_notes: aiNotes.trim() || undefined,
        },
      });
      if (pageErr) throw new Error(pageErr.message);
      if (pageData?.error) throw new Error(pageData.error);

      setStep("done");
      toast({ title: "Página criada!", description: `Rascunho '/p/${pageData.slug}' pronto pra revisão.` });
      setTimeout(() => navigate(`/admin/paginas/${pageData.slug}`), 800);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      setStep("error");
      toast({ title: "Falhou", description: msg, variant: "destructive" });
    }
  };

  const isWorking = step === "researching" || step === "generating";

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/admin/paginas" className="text-xs text-brand-text-muted hover:text-brand-gold inline-flex items-center gap-1 mb-6">
        <ChevronLeft className="size-3" /> Voltar para páginas
      </Link>

      <h1 className="font-display text-3xl text-brand-text-light flex items-center gap-3">
        <Sparkles className="size-6 text-brand-gold" />
        Nova página por tema
      </h1>
      <p className="text-sm text-brand-text-muted mt-1 mb-8">
        A IA pesquisa o tema na web, segue o tom da página Botox Masculino e gera os 11 blocos como rascunho.
      </p>

      <div className="space-y-5">
        <div>
          <Label htmlFor="tema" className="text-brand-text-light text-xs uppercase tracking-wider">
            Tema
          </Label>
          <Input
            id="tema"
            value={tema}
            onChange={(e) => onTemaChange(e.target.value)}
            placeholder="Ex: Preenchimento Labial em Curitiba"
            disabled={isWorking}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="slug" className="text-brand-text-light text-xs uppercase tracking-wider">
            Slug (URL)
          </Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="preenchimento-labial-curitiba"
            disabled={isWorking}
            className="mt-1.5 font-mono text-xs"
          />
          <p className="text-[11px] text-brand-text-muted mt-1">URL final: /p/{slug || "..."}</p>
        </div>

        <div>
          <Label htmlFor="links" className="text-brand-text-light text-xs uppercase tracking-wider">
            Links de referência <span className="text-brand-text-muted normal-case tracking-normal">(opcional)</span>
          </Label>
          <Textarea
            id="links"
            value={linksRaw}
            onChange={(e) => setLinksRaw(e.target.value)}
            placeholder={"Cole 1 link por linha. A IA usa como fonte prioritária.\nhttps://exemplo.com/artigo\nhttps://outro.com/referencia"}
            disabled={isWorking}
            rows={4}
            className="mt-1.5 font-mono text-xs"
          />
        </div>

        <div>
          <Label htmlFor="ai_notes" className="text-brand-text-light text-xs uppercase tracking-wider">
            Notas para a IA <span className="text-brand-text-muted normal-case tracking-normal">(opcional)</span>
          </Label>
          <Textarea
            id="ai_notes"
            value={aiNotes}
            onChange={(e) => setAiNotes(e.target.value)}
            placeholder={"Direcionamentos extras: público-alvo, ângulo editorial, o que evitar, palavras a usar.\nEx.: focar em mulheres 35+, evitar comparação com toxina, destacar abordagem progressiva."}
            disabled={isWorking}
            rows={3}
            className="mt-1.5"
          />
          <p className="text-[11px] text-brand-text-muted mt-1">
            A IA prioriza essas instruções sobre a pesquisa automática.
          </p>
        </div>

        <div className="pt-2">
          {step === "form" || step === "error" ? (
            <Button onClick={handleStart} className="bg-brand-gold text-brand-bg hover:bg-brand-gold/90">
              <Wand2 className="size-4" />
              Pesquisar e gerar página
            </Button>
          ) : (
            <Button disabled className="bg-brand-gold/50 text-brand-bg">
              <Loader2 className="size-4 animate-spin" />
              {step === "researching" && "Pesquisando o tema na web…"}
              {step === "generating" && "Gerando os 11 blocos…"}
              {step === "done" && "Pronto! Abrindo editor…"}
            </Button>
          )}
        </div>

        {error && (
          <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Progress feedback */}
        {(step === "researching" || step === "generating" || step === "done") && (
          <div className="border border-brand-gold/15 bg-brand-graphite/20 p-5 space-y-3 text-sm">
            <ProgressLine done={step !== "researching"} active={step === "researching"} icon={Search} label="Pesquisa web (Firecrawl)" />
            <ProgressLine
              done={step === "done"}
              active={step === "generating"}
              icon={Wand2}
              label="Geração dos 11 blocos (IA)"
            />
          </div>
        )}

        {research && (
          <details className="border border-brand-gold/15 bg-brand-graphite/10 p-4 text-xs">
            <summary className="cursor-pointer text-brand-text-light font-medium">
              Pesquisa coletada ({research.duvidas?.length || 0} dúvidas, {sources.length} fontes)
            </summary>
            <div className="mt-3 space-y-3 text-brand-text-muted">
              <div>
                <strong className="text-brand-text-light">Público-alvo:</strong> {research.publico_alvo}
              </div>
              <div>
                <strong className="text-brand-text-light">Dúvidas reais:</strong>
                <ul className="list-disc list-inside mt-1">
                  {research.duvidas?.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
              {sources.length > 0 && (
                <div>
                  <strong className="text-brand-text-light">Fontes:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {sources.slice(0, 5).map((s, i) => (
                      <li key={i} className="truncate">
                        <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-brand-gold">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function ProgressLine({
  done,
  active,
  icon: Icon,
  label,
}: {
  done: boolean;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {active ? (
        <Loader2 className="size-4 animate-spin text-brand-gold" />
      ) : done ? (
        <Icon className="size-4 text-brand-gold" />
      ) : (
        <Icon className="size-4 text-brand-text-muted/40" />
      )}
      <span className={done || active ? "text-brand-text-light" : "text-brand-text-muted/50"}>{label}</span>
    </div>
  );
}