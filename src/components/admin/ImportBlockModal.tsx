import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BLOCK_LABELS, type BlockType } from "@/types/blocks";
import { type ScannedPage, type ExtractedSection } from "@/types/scanner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (type: BlockType, data: any) => void;
  pageTitle?: string;
  pageCategory?: string;
}

export function ImportBlockModal({ open, onOpenChange, onImport, pageTitle, pageCategory }: Props) {
  const [source, setSource] = useState("");
  const [isUrl, setIsUrl] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "sections">("input");
  const [scanResult, setScanResult] = useState<ScannedPage | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const { toast } = useToast();

  async function handleExtract() {
    if (!source.trim()) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scanner-v1", {
        body: { 
          url: isUrl ? source : null,
          text: isUrl ? null : source,
        },
      });

      if (error) throw error;
      if (!data?.sections || data.sections.length === 0) {
        toast({ title: "Nenhum conteúdo detectado", variant: "destructive" });
        return;
      }

      setScanResult(data);
      setStep("sections");
    } catch (e) {
      console.error(e);
      toast({ title: "Erro na extração", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function toggleSection(id: string) {
    setSelectedSections(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-brand-black border-brand-gold/20 text-brand-text-light overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display text-xl text-brand-gold">Importar Bloco com IA</DialogTitle>
          <DialogDescription className="text-brand-text-muted">
            Extraia conteúdo de uma URL ou texto e converta automaticamente para blocos Premium.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-0 flex flex-col">
          <div className="p-6 border-b border-brand-gold/10">
            <div className="flex gap-4 mb-4">
              <button 
                onClick={() => setIsUrl(true)}
                className={cn(
                  "text-xs uppercase tracking-widest pb-2 px-2 transition-colors",
                  isUrl ? "text-brand-gold border-b-2 border-brand-gold" : "text-brand-text-muted hover:text-brand-text-light"
                )}
              >
                Por URL
              </button>
              <button 
                onClick={() => setIsUrl(false)}
                className={cn(
                  "text-xs uppercase tracking-widest pb-2 px-2 transition-colors",
                  !isUrl ? "text-brand-gold border-b-2 border-brand-gold" : "text-brand-text-muted hover:text-brand-text-light"
                )}
              >
                Colar Texto
              </button>
              {step === "input" && (
                 <div className="space-y-2 w-full">
                  <Label className="text-xs text-brand-text-muted uppercase tracking-wider">
                    {isUrl ? "URL da página antiga" : "Conteúdo bruto"}
                  </Label>
                  <div className="flex gap-2">
                    {isUrl ? (
                      <Input 
                        placeholder="https://esteticabatel.com.br/..." 
                        value={source}
                        onChange={e => setSource(e.target.value)}
                        className="bg-brand-graphite/40 border-brand-gold/10 text-brand-text-light"
                      />
                    ) : (
                      <Textarea 
                        placeholder="Cole aqui..." 
                        value={source}
                        onChange={e => setSource(e.target.value)}
                        rows={4}
                        className="bg-brand-graphite/40 border-brand-gold/10 text-brand-text-light"
                      />
                    )}
                    <Button 
                      onClick={handleExtract} 
                      disabled={loading || !source.trim()}
                      className="bg-brand-gold text-brand-green hover:bg-brand-gold/90 shrink-0"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4 mr-2" />}
                      Scanear
                    </Button>
                  </div>
                 </div>
              )}

              {step === "sections" && scanResult && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-brand-gold font-display">{scanResult.page_metadata.detected_title}</h3>
                    <p className="text-[10px] text-brand-text-muted">{scanResult.sections.length} seções detectadas</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep("input")} className="text-xs border-brand-gold/20 text-brand-text-light">
                    Scanear outra página
                  </Button>
                </div>
              )}
            </div>
          </div>

          {step === "sections" && scanResult && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {scanResult.sections.map((section: ExtractedSection) => (
                <div 
                  key={section.id}
                  className={cn(
                    "p-4 rounded border transition-all cursor-pointer",
                    selectedSections.includes(section.id) 
                      ? "bg-brand-gold/10 border-brand-gold/40" 
                      : "bg-brand-graphite/20 border-transparent hover:border-brand-gold/20"
                  )}
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedSections.includes(section.id)} className="accent-brand-gold" readOnly />
                    <div>
                      <h4 className="text-sm font-bold text-brand-gold">{section.raw_title}</h4>
                      <p className="text-[10px] text-brand-text-muted uppercase">{section.suggested_type} • Confiança: {Math.round(section.confidence * 100)}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-brand-text-light/70 line-clamp-2">{section.raw_content}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 bg-brand-graphite rounded text-brand-gold uppercase">{section.usage_policy}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-brand-graphite rounded text-brand-text-muted uppercase">{section.source_origin}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-brand-gold/10 bg-brand-graphite/60 backdrop-blur shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-brand-text-muted hover:text-brand-text-light">
            Cancelar
          </Button>
          {step === "sections" && (
            <Button 
              onClick={() => {
                toast({ title: "Funcionalidade em desenvolvimento", description: "A conversão de seções selecionadas para blocos será implementada na próxima fase." });
              }} 
              disabled={selectedSections.length === 0}
              className="bg-brand-gold text-brand-green hover:bg-brand-gold/90"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Confirmar Seleção ({selectedSections.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
