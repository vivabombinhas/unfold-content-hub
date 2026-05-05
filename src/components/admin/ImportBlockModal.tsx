import { useState } from "react";
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
  const [sections, setSections] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const { toast } = useToast();

  async function handleExtract() {
    if (!source.trim()) return;
    setLoading(true);
    setSections([]);
    setSelectedIdx(null);

    try {
      const { data, error } = await supabase.functions.invoke("extract-block-content", {
        body: { 
          url: isUrl ? source : null,
          text: isUrl ? null : source,
          page_title: pageTitle,
          page_category: pageCategory
        },
      });

      if (error) throw error;
      if (!data?.sections || data.sections.length === 0) {
        toast({ 
          title: "Nenhum bloco encontrado", 
          description: "A IA não conseguiu identificar seções compatíveis com os blocos premium.",
          variant: "destructive"
        });
        return;
      }

      setSections(data.sections);
      setSelectedIdx(0);
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Erro na extração", 
        description: "Verifique a URL ou tente colar o texto manualmente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedSection = selectedIdx !== null ? sections[selectedIdx] : null;

  function updateSelectedData(field: string, value: any) {
    if (selectedIdx === null) return;
    setSections(prev => {
      const next = [...prev];
      next[selectedIdx] = {
        ...next[selectedIdx],
        data: {
          ...next[selectedIdx].data,
          [field]: value
        }
      };
      return next;
    });
  }

  function updateCard(idx: number, field: string, value: string) {
    if (selectedIdx === null) return;
    const currentData = sections[selectedIdx].data;
    const key = selectedSection.target_type === "beneficios_grid" ? "cards" : "side_cards";
    const cards = [...(currentData[key] || [])];
    cards[idx] = { ...cards[idx], [field]: value };
    updateSelectedData(key, cards);
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

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-brand-gold/10 pb-2">
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
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-brand-text-muted uppercase tracking-wider">
                {isUrl ? "URL da página antiga" : "Conteúdo da seção"}
              </Label>
              <div className="flex gap-2">
                {isUrl ? (
                  <Input 
                    placeholder="https://esteticabatel.com.br/..." 
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="bg-brand-graphite/40 border-brand-gold/10 focus:border-brand-gold/40 text-brand-text-light"
                  />
                ) : (
                  <Textarea 
                    placeholder="Cole aqui o texto dos benefícios ou da descrição do procedimento..." 
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    rows={4}
                    className="bg-brand-graphite/40 border-brand-gold/10 focus:border-brand-gold/40 text-brand-text-light"
                  />
                )}
                <Button 
                  onClick={handleExtract} 
                  disabled={loading || !source.trim()}
                  className="bg-brand-gold text-brand-green hover:bg-brand-gold/90 shrink-0"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4 mr-2" />}
                  Extrair
                </Button>
              </div>
            </div>
          </div>

          {sections.length > 0 && (
            <div className="grid grid-cols-[200px_1fr] gap-6 border-t border-brand-gold/10 pt-6 animate-in fade-in slide-in-from-top-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-brand-text-muted uppercase tracking-widest">Seções Detectadas</Label>
                <div className="space-y-1">
                  {sections.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIdx(i)}
                      className={cn(
                        "w-full text-left p-3 rounded text-xs transition-all border",
                        selectedIdx === i 
                          ? "bg-brand-gold/10 border-brand-gold/40 text-brand-gold" 
                          : "bg-brand-graphite/20 border-transparent text-brand-text-muted hover:border-brand-gold/20"
                      )}
                    >
                      <div className="font-bold mb-1">{s.suggested_label || "Seção Detectada"}</div>
                      <div className="text-[10px] opacity-70">Tipo: {BLOCK_LABELS[s.target_type as BlockType] || s.target_type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSection && (
                <div className="space-y-4">
                  <Label className="text-[10px] text-brand-text-muted uppercase tracking-widest">Preview dos Dados</Label>
                  <div className="bg-brand-graphite/40 rounded-lg border border-brand-gold/10 p-4 max-h-[300px] overflow-y-auto">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] text-brand-gold uppercase tracking-wider">Eyebrow</Label>
                          <Input 
                            value={selectedSection.data.eyebrow || ""} 
                            onChange={e => updateSelectedData("eyebrow", e.target.value)}
                            className="bg-brand-graphite/60 border-brand-gold/10 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-brand-gold uppercase tracking-wider">Título (HTML permitido)</Label>
                          <Input 
                            value={selectedSection.data.title_html || ""} 
                            onChange={e => updateSelectedData("title_html", e.target.value)}
                            className="bg-brand-graphite/60 border-brand-gold/10 text-xs h-8"
                          />
                        </div>
                      </div>

                      {selectedSection.target_type === "beneficios_grid" && (
                        <div className="space-y-3">
                          <Label className="text-[10px] text-brand-gold uppercase tracking-wider block">Benefícios ({selectedSection.data.cards?.length})</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {selectedSection.data.cards?.map((c: any, i: number) => (
                              <div key={i} className="space-y-2 p-3 bg-brand-graphite/20 rounded border border-brand-gold/5">
                                <Input 
                                  value={c.title || ""} 
                                  onChange={e => updateCard(i, "title", e.target.value)}
                                  className="bg-transparent border-none p-0 h-auto font-bold text-xs focus-visible:ring-0"
                                  placeholder="Título do card"
                                />
                                <Textarea 
                                  value={c.text || ""} 
                                  onChange={e => updateCard(i, "text", e.target.value)}
                                  className="bg-transparent border-none p-0 min-h-0 text-[11px] text-brand-text-muted focus-visible:ring-0 resize-none"
                                  placeholder="Texto do card"
                                  rows={2}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedSection.target_type === "procedimento_detalhado_v2" && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] text-brand-gold uppercase tracking-wider">Descrição Principal</Label>
                            <Textarea 
                              value={selectedSection.data.paragraphs?.[0] || ""} 
                              onChange={e => {
                                const paras = [...(selectedSection.data.paragraphs || [])];
                                paras[0] = e.target.value;
                                updateSelectedData("paragraphs", paras);
                              }}
                              className="bg-brand-graphite/60 border-brand-gold/10 text-[11px] min-h-[80px]"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-[10px] text-brand-gold uppercase tracking-wider block">Cards Laterais ({selectedSection.data.side_cards?.length})</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {selectedSection.data.side_cards?.map((c: any, i: number) => (
                                <div key={i} className="space-y-2 p-3 bg-brand-graphite/20 rounded border border-brand-gold/5">
                                  <Input 
                                    value={c.title || ""} 
                                    onChange={e => updateCard(i, "title", e.target.value)}
                                    className="bg-transparent border-none p-0 h-auto font-bold text-xs focus-visible:ring-0"
                                    placeholder="Título do destaque"
                                  />
                                  <Textarea 
                                    value={c.text || ""} 
                                    onChange={e => updateCard(i, "text", e.target.value)}
                                    className="bg-transparent border-none p-0 min-h-0 text-[11px] text-brand-text-muted focus-visible:ring-0 resize-none"
                                    placeholder="Texto do destaque"
                                    rows={2}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-brand-gold/10 bg-brand-graphite/60 backdrop-blur shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-brand-text-muted hover:text-brand-text-light">
            Cancelar
          </Button>
          <Button 
            onClick={() => selectedSection && onImport(selectedSection.target_type, selectedSection.data)} 
            disabled={selectedIdx === null}
            className="bg-brand-gold text-brand-green hover:bg-brand-gold/90"
          >
            <CheckCircle2 className="size-4 mr-2" />
            Inserir na página
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
