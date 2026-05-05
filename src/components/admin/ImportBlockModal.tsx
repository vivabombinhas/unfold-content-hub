import React, { useState, useMemo } from "react";
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
 import { Loader2, Download, Search, CheckCircle2, AlertCircle, ChevronDown, Image as ImageIcon, Upload, X, Diff } from "lucide-react";
 import { DiffViewer } from "./DiffViewer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  const [mode, setMode] = useState<"url" | "text" | "vision">("url");
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [visionOrigin, setVisionOrigin] = useState<"batel_legacy" | "external_reference">("batel_legacy");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "sections">("input");
  const [scanResult, setScanResult] = useState<ScannedPage | null>(null);
   const [selectedSections, setSelectedSections] = useState<Record<string, { selected: boolean; forcedType?: BlockType; editedContent?: string }>>({});
 const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resize and compress
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        setVisionImage(base64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleExtract() {
    if (mode === "vision" && (!source.trim() || !visionImage)) {
      toast({ title: "Imagem e texto são obrigatórios", variant: "destructive" });
      return;
    }
    if (mode !== "vision" && !source.trim()) return;

    setLoading(true);
    
    try {
      let data, error;

      if (mode === "vision") {
        const response = await supabase.functions.invoke("scanner-vision-v1", {
          body: { 
            image: visionImage,
            text: source,
            origin: visionOrigin
          },
        });
        data = response.data;
        error = response.error;
      } else {
        const response = await supabase.functions.invoke("scanner-v1", {
          body: { 
            url: mode === "url" ? source : null,
            text: mode === "text" ? source : null,
          },
        });
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      if (!data?.sections || data.sections.length === 0) {
        toast({ title: "Nenhum conteúdo detectado", variant: "destructive" });
        return;
      }

      setScanResult(data);
      const initialSelected: Record<string, { selected: boolean; forcedType?: BlockType }> = {};
      data.sections.forEach((s: any) => {
        initialSelected[s.id] = { selected: false };
      });
      setSelectedSections(initialSelected);
      setStep("sections");
    } catch (e) {
      console.error(e);
      toast({ title: "Erro na extração", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = useMemo(() => 
    Object.values(selectedSections).filter(s => s.selected).length
  , [selectedSections]);

  function toggleSection(id: string) {
    setSelectedSections(prev => ({
      ...prev,
      [id]: { ...prev[id], selected: !prev[id]?.selected }
    }));
  }

  function setSectionType(id: string, type: BlockType) {
    setSelectedSections(prev => ({
      ...prev,
      [id]: { ...prev[id], forcedType: type, selected: true }
    }));
  }

   function toggleDiff(id: string) {
     setExpandedDiffs(prev => ({
       ...prev,
       [id]: !prev[id]
     }));
   }
 
   function updateSectionContent(id: string, content: string) {
     setSelectedSections(prev => ({
       ...prev,
       [id]: { ...prev[id], editedContent: content, selected: true }
     }));
   }
 
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-brand-black border-brand-gold/20 text-brand-text-light overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-display text-xl text-brand-gold">Importar Bloco com IA</DialogTitle>
          <DialogDescription className="text-brand-text-muted">
            Extraia conteúdo de uma URL, texto ou print e converta automaticamente para blocos Premium.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-0 flex flex-col">
          <div className="p-6 border-b border-brand-gold/10">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex gap-4">
                {(["url", "text", "vision"] as const).map((m) => (
                  <button 
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setStep("input");
                    }}
                    className={cn(
                      "text-[10px] uppercase tracking-widest pb-2 px-2 transition-colors whitespace-nowrap",
                      mode === m ? "text-brand-gold border-b-2 border-brand-gold" : "text-brand-text-muted hover:text-brand-text-light"
                    )}
                  >
                    {m === "url" ? "Por URL" : m === "text" ? "Colar Texto" : "Print + Texto"}
                  </button>
                ))}
              </div>
              
              {step === "input" && (
                <div className="space-y-4 w-full">
                  <div className="flex flex-col gap-4">
                    {mode === "vision" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-brand-text-muted uppercase tracking-wider">Print da Seção</Label>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "aspect-video bg-brand-graphite/40 border-2 border-dashed border-brand-gold/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-gold/30 transition-all overflow-hidden relative",
                              visionImage && "border-solid border-brand-gold/20"
                            )}
                          >
                            {visionImage ? (
                              <>
                                <img src={visionImage} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setVisionImage(null); }}
                                  className="absolute top-2 right-2 size-6 bg-brand-black/80 rounded-full flex items-center justify-center text-brand-text-light hover:bg-brand-bordeaux transition-colors"
                                >
                                  <X className="size-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <Upload className="size-6 text-brand-gold/40 mb-2" />
                                <span className="text-[10px] text-brand-text-muted uppercase tracking-wider">Upload Print</span>
                              </>
                            )}
                          </div>
                          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-brand-text-muted uppercase tracking-wider">Origem do Conteúdo</Label>
                            <RadioGroup 
                              value={visionOrigin} 
                              onValueChange={(v) => setVisionOrigin(v as any)}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="batel_legacy" id="batel" className="border-brand-gold/40 text-brand-gold" />
                                <Label htmlFor="batel" className="text-xs text-brand-text-light cursor-pointer">
                                  Página Antiga Batel <span className="text-[9px] text-brand-gold/60 block">Preserva texto literal</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="external_reference" id="external" className="border-brand-gold/40 text-brand-gold" />
                                <Label htmlFor="external" className="text-xs text-brand-text-light cursor-pointer">
                                  Referência Externa <span className="text-[9px] text-brand-text-muted block">Gera copy original</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-brand-text-muted uppercase tracking-wider">
                        {mode === "url" ? "URL da página antiga" : mode === "vision" ? "Texto da Seção" : "Conteúdo bruto"}
                      </Label>
                      <div className="flex gap-2">
                        {mode === "url" ? (
                          <Input 
                            placeholder="https://esteticabatel.com.br/..." 
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            className="bg-brand-graphite/40 border-brand-gold/10 text-brand-text-light"
                          />
                        ) : (
                          <Textarea 
                            placeholder={mode === "vision" ? "Cole o texto literal desta seção aqui..." : "Cole aqui..."} 
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            rows={mode === "vision" ? 6 : 4}
                            className="bg-brand-graphite/40 border-brand-gold/10 text-brand-text-light"
                          />
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleExtract} 
                      disabled={loading || !source.trim() || (mode === "vision" && !visionImage)}
                      className="bg-brand-gold text-brand-green hover:bg-brand-gold/90 w-full mt-2"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <ImageIcon className="size-4 mr-2" />}
                      {mode === "vision" ? "Analisar Print + Texto" : "Scanear"}
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
                     "p-4 rounded border transition-all",
                     selectedSections[section.id]?.selected 
                       ? "bg-brand-gold/10 border-brand-gold/40" 
                       : "bg-brand-graphite/20 border-transparent hover:border-brand-gold/20"
                   )}
                 >
                   <div className="flex items-start justify-between gap-3">
                     <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleSection(section.id)}>
                       <input type="checkbox" checked={selectedSections[section.id]?.selected} className="accent-brand-gold" readOnly />
                       <div>
                         <h4 className="text-sm font-bold text-brand-gold">{section.raw_title}</h4>
                         <p className="text-[10px] text-brand-text-muted uppercase">
                           {BLOCK_LABELS[selectedSections[section.id]?.forcedType || (section.suggested_type as BlockType)] || section.suggested_type} • Confiança: {Math.round(section.confidence * 100)}%
                         </p>
                       </div>
                     </div>

                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-brand-gold/70 border border-brand-gold/20 hover:text-brand-gold hover:bg-brand-gold/10">
                           Trocar Tipo <ChevronDown className="ml-1 size-3" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent className="bg-brand-graphite border-brand-gold/20 text-brand-text-light max-h-[300px] overflow-y-auto">
                         {Object.entries(BLOCK_LABELS).map(([type, label]) => (
                           <DropdownMenuItem 
                             key={type} 
                             onClick={() => setSectionType(section.id, type as BlockType)}
                             className="text-xs hover:bg-brand-gold/10 cursor-pointer"
                           >
                             {label}
                           </DropdownMenuItem>
                         ))}
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                   {!expandedDiffs[section.id] ? (
                     <p className="mt-2 text-xs text-brand-text-light/70 whitespace-pre-wrap">{section.raw_content}</p>
                   ) : (
                     <div className="mt-4 pt-4 border-t border-brand-gold/10">
                       <DiffViewer
                         oldText={mode === "vision" ? source : section.raw_html_snippet || ""}
                         newText={section.raw_content}
                         onSelectText={(text) => updateSectionContent(section.id, text)}
                         selectedText={selectedSections[section.id]?.editedContent || section.raw_content}
                       />
                     </div>
                   )}
 
                  <div className="flex gap-2 mt-2">
                     <span className="text-[9px] px-1.5 py-0.5 bg-brand-graphite rounded text-brand-gold uppercase">{section.usage_policy}</span>
                     <span className="text-[9px] px-1.5 py-0.5 bg-brand-graphite rounded text-brand-text-muted uppercase">{section.source_origin}</span>
                     <button 
                       onClick={() => toggleDiff(section.id)}
                       className="text-[9px] px-1.5 py-0.5 bg-brand-gold/10 hover:bg-brand-gold/20 rounded text-brand-gold uppercase flex items-center gap-1 transition-colors"
                     >
                       <Diff className="size-2.5" />
                       {expandedDiffs[section.id] ? "Esconder Diff" : "Ver Diff/Comparação"}
                     </button>
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
                if (!scanResult) return;
                const chosen = scanResult.sections.filter((s) => selectedSections[s.id]?.selected);
                if (chosen.length === 0) return;
                chosen.forEach((section) => {
                  const sel = selectedSections[section.id];
                  const type = (sel?.forcedType || section.suggested_type) as BlockType;
                  const finalText = sel?.editedContent ?? section.raw_content;
                  const data = buildBlockData(type, section, finalText);
                  onImport(type, data);
                });
                toast({
                  title: `${chosen.length} bloco(s) importado(s)`,
                  description: "Adicionados como rascunho no final da página.",
                });
                onOpenChange(false);
              }} 
              disabled={selectedCount === 0}
              className="bg-brand-gold text-brand-green hover:bg-brand-gold/90"
            >
              <CheckCircle2 className="size-4 mr-2" />
               Confirmar Seleção ({selectedCount})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildBlockData(type: BlockType, section: ExtractedSection, finalText: string): any {
  const title = section.raw_title || "";
  const ed = section.extracted_data || {};
  switch (type) {
    case "beneficios_grid":
      return {
        title,
        subtitle: ed.subtitle || "",
        items: Array.isArray(ed.items) && ed.items.length > 0
          ? ed.items
          : finalText
              .split(/\n+/)
              .filter((l) => l.trim())
              .slice(0, 8)
              .map((line) => {
                const [t, ...rest] = line.split(/[:–-]/);
                return { title: t.trim(), description: rest.join("-").trim() };
              }),
      };
    case "procedimento_detalhado_v2":
      return {
        title,
        intro: ed.intro || finalText,
        steps: Array.isArray(ed.steps) ? ed.steps : [],
        duration: ed.duration || "",
        recovery: ed.recovery || "",
      };
    case "texto_livre" as BlockType:
    default:
      return { title, content: finalText };
  }
}
