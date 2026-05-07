import { Button } from "@/components/ui/button";

export function ImageThumb({ url, onSelect }: { url: string; onSelect: (type: 'cover' | 'before' | 'after') => void }) {
  return (
    <div className="group relative aspect-square bg-brand-black/40 border border-brand-gold/5 rounded overflow-hidden">
      <img src={url} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-brand-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col p-1 gap-1">
        <Button size="sm" type="button" className="h-6 text-[8px] bg-brand-gold text-brand-bg py-0 hover:bg-brand-gold/90" onClick={() => onSelect('cover')}>Capa</Button>
        <div className="flex gap-1">
          <Button size="sm" type="button" variant="outline" className="h-6 flex-1 text-[8px] py-0 border-brand-gold/20" onClick={() => onSelect('before')}>Antes</Button>
          <Button size="sm" type="button" variant="outline" className="h-6 flex-1 text-[8px] py-0 border-brand-gold/20" onClick={() => onSelect('after')}>Depois</Button>
        </div>
      </div>
    </div>
  );
}
