import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/** Converte links do Google Drive `/file/d/ID/view` em URL servível. */
function normalizeUrl(url: string): string {
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  return url;
}

export function MediaInput({ value, onChange, label }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    <div className="space-y-2">
      {label && <p className="text-xs text-brand-text-muted uppercase tracking-wider">{label}</p>}
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="" className="max-h-32 border border-brand-gold/20" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 size-6 grid place-items-center bg-brand-bordeaux text-white rounded-full"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload className="size-3.5 mr-1.5" />
          {uploading ? "Subindo…" : "Subir arquivo"}
        </Button>
        <Input
          type="url"
          placeholder="ou cole link (Google Drive, Imgur…)"
          value={value}
          onChange={(e) => onChange(normalizeUrl(e.target.value))}
          className="flex-1 text-xs"
        />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    </div>
  );
}