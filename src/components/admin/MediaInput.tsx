import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
 import { Upload, Link2, X, Image as ImageIcon, Check, Loader2, Library } from "lucide-react";
 import { ImageBankModal } from "./ImageBankModal";
import { toast } from "@/hooks/use-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  isolateImageBankKeyboardEvents?: boolean;
}

/** Converte links do Google Drive `/file/d/ID/view` em URL servível. */
function normalizeUrl(url: string): string {
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return url;
}

export function MediaInput({ value, onChange, label, isolateImageBankKeyboardEvents = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState(value);

  useEffect(() => {
    setTempUrl(value);
  }, [value]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Falha no upload", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    onChange(data.publicUrl);
  }

  return (
    <div className="space-y-2.5">
      {label && <Label className="text-[10px] text-brand-text-muted uppercase tracking-widest font-bold">{label}</Label>}
      
      <div className="relative group min-h-[120px] rounded-md border border-brand-gold/15 bg-brand-black/40 flex items-center justify-center overflow-hidden transition-all hover:border-brand-gold/30">
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-contain max-h-[200px]" />
            <div className="absolute inset-0 bg-brand-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
              <div className="flex flex-wrap justify-center gap-2 mb-2">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => fileRef.current?.click()} 
                  className="h-8 bg-brand-gold text-brand-bg hover:bg-brand-gold/90"
                >
                  <Upload className="size-3.5 mr-1.5" />
                  Trocar
                </Button>
                <ImageBankModal onSelect={onChange} isolateKeyboardEvents={isolateImageBankKeyboardEvents} />
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="destructive" 
                onClick={() => onChange("")} 
                className="h-8 w-full max-w-[120px]"
              >
                <X className="size-3.5 mr-1.5" />
                Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="size-10 rounded-full bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20">
              {uploading ? <Loader2 className="size-5 text-brand-gold animate-spin" /> : <ImageIcon className="size-5 text-brand-gold/60" />}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-brand-text-light font-medium">Nenhuma imagem selecionada</p>
              <p className="text-[10px] text-brand-text-muted">Suba um arquivo ou cole um link direto</p>
            </div>
             <div className="flex flex-wrap justify-center gap-2 mt-1">
               <ImageBankModal onSelect={onChange} isolateKeyboardEvents={isolateImageBankKeyboardEvents} />
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={() => fileRef.current?.click()} 
                disabled={uploading}
                className="h-8 text-[11px] border-brand-gold/20 hover:bg-brand-gold/10"
              >
                <Upload className="size-3.5 mr-1.5" />
                Subir Arquivo
              </Button>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="h-8 text-[11px] border-brand-gold/20 hover:bg-brand-gold/10"
              >
                <Link2 className="size-3.5 mr-1.5" />
                Colar Link
              </Button>
            </div>
          </div>
        )}
      </div>

      {(showUrlInput || (tempUrl && !value)) && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
          <Input
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            className="flex-1 h-9 text-xs bg-brand-black/60 border-brand-gold/20"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onChange(normalizeUrl(tempUrl)), setShowUrlInput(false))}
          />
          <Button 
            type="button" 
            size="sm" 
            className="h-9 px-3 bg-brand-gold text-brand-bg"
            onClick={() => {
              onChange(normalizeUrl(tempUrl));
              setShowUrlInput(false);
            }}
          >
            <Check className="size-4" />
          </Button>
        </div>
      )}
      
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>;
}