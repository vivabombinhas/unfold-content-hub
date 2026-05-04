import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Search, Wand2, Loader2, ChevronLeft, CheckCircle2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Step = "form" | "researching" | "generating" | "done" | "error";

interface ResearchData {
  duvidas: string[];
  objecoes: string[];
  termos: string[];
  angulos: string[];
  publico_alvo: string;
  area_anatomica: string;
}

interface ScrapeDiagnostic {
  url: string;
  ok: boolean;
  status: number;
  markdown_chars: number;
  html_chars: number;
  images_found: number;
  error?: string;
}

interface OldPageContent {
  testimonials?: { name?: string; text?: string }[];
  faqs?: { question?: string; answer?: string }[];
  sections?: { title?: string; body?: string; type_suggestion?: string }[];
  images?: { url?: string; alt?: string }[];
}

const OWN_DOMAIN = "esteticabatel.com.br";

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
  const [linksAreOwnOldPage, setLinksAreOwnOldPage] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [research, setResearch] = useState<ResearchData | null>(null);
  const [sources, setSources] = useState<{ url: string; title: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<ScrapeDiagnostic[]>([]);
  const [oldPageContent, setOldPageContent] = useState<OldPageContent | null>(null);
  const [confirmIntent, setConfirmIntent] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [pendingResearch, setPendingResearch] = useState<unknown>(null);

  const links = useMemo(
    () => linksRaw.split(/\s+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)),
    [linksRaw],
  );
  const hasOwnDomainLink = useMemo(
    () => links.some((u) => { try { return new URL(u).hostname.endsWith(OWN_DOMAIN); } catch { return false; } }),
    [links],
  );

  // Fase A: auto-detect domínio próprio
  useEffect(() => {
    if (hasOwnDomainLink && !linksAreOwnOldPage) {
      setLinksAreOwnOldPage(true);
    }
  }, [hasOwnDomainLink]); // eslint-disable-line

  const onTemaChange = (v: string) => {
    setTema(v);
    if (!slug || slug === slugify(tema)) setSlug(slugify(v));
  };

  const runFlow = async (allowAiOnlyFallback: boolean) => {
    setError(null);
    if (tema.trim().length < 3) {
      toast({ title: "Tema muito curto", variant: "destructive" });
      return;
    }
    if (slug.length < 3) {
      toast({ title: "Slug inválido", variant: "destructive" });
      return;
    }

    try {
      // Step 1: research
      setStep("researching");
      const { data: researchData, error: researchErr } = await supabase.functions.invoke("research-topic", {
        body: { tema, links_referencia: links, own_old_page: linksAreOwnOldPage && links.length > 0 },
      });
      if (researchErr) throw new Error(researchErr.message);
      if (researchData?.error) throw new Error(researchData.error);
      setResearch(researchData.research);
      setSources(researchData.sources || []);
      setDiagnostics(researchData.scrape_diagnostics || []);
      setOldPageContent(researchData.old_page_content || null);
      setPendingResearch(researchData);

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
          own_old_page: linksAreOwnOldPage && links.length > 0,
          old_page_content: researchData.old_page_content || null,
          scrape_diagnostics: researchData.scrape_diagnostics || [],
          allow_ai_only_fallback: allowAiOnlyFallback,
        },
      });
      if (pageErr) throw new Error(pageErr.message);
      if (pageData?.error === "extraction_empty") {
        // Pausa e pergunta ao usuário
        setStep("form");
        setConfirmEmpty(true);
        return;
      }
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

  const handleStart = () => {
    // Fase A: se tem URL e o checkbox NÃO está marcado, perguntar.
    if (links.length > 0 && !linksAreOwnOldPage) {
      setConfirmIntent(true);
      return;
    }
    runFlow(false);
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
          {hasOwnDomainLink && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-brand-gold border border-brand-gold/30 bg-brand-gold/5 px-2.5 py-1.5">
              <CheckCircle2 className="size-3.5" />
              <span>Detectado: página da clínica. Vou preservar conteúdo real.</span>
            </div>
          )}
          <label className="mt-3 flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={linksAreOwnOldPage}
              onCheckedChange={(v) => setLinksAreOwnOldPage(!!v)}
              disabled={isWorking || links.length === 0}
              className="mt-0.5"
            />
            <span className="text-xs text-brand-text-light leading-snug">
              Estes links são <strong>páginas antigas da própria clínica</strong>
              <span className="block text-[11px] text-brand-text-muted mt-0.5">
                Quando marcado, a IA aproveita conteúdo real (depoimentos, FAQs, seções) da página antiga. Quando desmarcado, trata só como inspiração — não copia conteúdo.
              </span>
            </span>
          </label>
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

        {/* Diagnóstico da extração */}
        {diagnostics.length > 0 && (
          <div className="border border-brand-gold/15 bg-brand-graphite/10 p-4 text-xs space-y-2">
            <p className="text-brand-text-light font-medium uppercase tracking-wider text-[11px]">
              Diagnóstico da extração
            </p>
            {diagnostics.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-brand-text-muted">
                {d.ok ? <CheckCircle2 className="size-3.5 text-brand-gold shrink-0 mt-0.5" /> : <AlertTriangle className="size-3.5 text-brand-bordeaux shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-brand-text-light">{d.url}</p>
                  <p>
                    HTTP {d.status} · markdown {(d.markdown_chars / 1024).toFixed(1)} KB · html {(d.html_chars / 1024).toFixed(1)} KB · {d.images_found} imagens
                    {d.error ? ` · erro: ${d.error}` : ""}
                  </p>
                </div>
              </div>
            ))}
            {oldPageContent && (
              <div className="pt-2 border-t border-brand-gold/15 text-brand-text-light">
                Extraídos: <strong>{oldPageContent.faqs?.length || 0}</strong> FAQs ·{" "}
                <strong>{oldPageContent.testimonials?.length || 0}</strong> depoimentos ·{" "}
                <strong>{oldPageContent.sections?.length || 0}</strong> seções ·{" "}
                <strong>{oldPageContent.images?.length || 0}</strong> imagens
              </div>
            )}
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

      {/* Confirma intenção quando há URL mas checkbox desmarcado */}
      <AlertDialog open={confirmIntent} onOpenChange={setConfirmIntent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como devo usar essa(s) URL(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Você forneceu URL(s) de referência mas não marcou "página antiga da própria clínica".
              Quer reaproveitar conteúdo real (FAQs, depoimentos, seções) ou usar só como inspiração?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmIntent(false); runFlow(false); }}>
              Só inspiração
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setLinksAreOwnOldPage(true); setConfirmIntent(false); setTimeout(() => runFlow(false), 50); }}>
              Reaproveitar conteúdo real
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bloqueio: extração vazia */}
      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A extração não retornou conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhuma FAQ, depoimento, seção ou imagem foi extraída da página antiga.
              Possíveis motivos: bloqueio anti-bot, lazy-load JS, paywall ou página vazia.
              Quer prosseguir mesmo assim com IA pura (a página será 100% inventada pela IA)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEmpty(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmEmpty(false); runFlow(true); }}>
              Gerar com IA pura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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