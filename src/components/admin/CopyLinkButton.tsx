import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Copia para a área de transferência o link absoluto da página
 * (publicado ou rascunho/preview), baseado no slug e status.
 *
 * Por que absoluto: o usuário normalmente quer enviar o link por
 * WhatsApp / e-mail. Usamos `window.location.origin` para que, em
 * preview da Lovable, em deploy publicado e em domínio custom, sempre
 * use a origem correta sem hardcode.
 */
interface Props {
  slug: string;
  /** Caminho hierárquico novo (ex: protocolo-batel/bioestimuladores/em-curitiba/flacidez). Se ausente, cai em /p/{slug}. */
  urlPath?: string;
  status: "draft" | "published";
  /** "icon" = só ícone (para tabelas). "default" = ícone + texto. */
  variant?: "icon" | "default";
  className?: string;
}

export function CopyLinkButton({ slug, urlPath, status, variant = "default", className }: Props) {
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publishedPath = urlPath ? `/${urlPath}/` : `/p/${slug}`;
    const path = status === "published" ? publishedPath : `/p/${slug}?preview=1`;
    return `${origin}${path}`;
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = buildUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: status === "published" ? "Link público copiado" : "Link de rascunho copiado",
        description: url,
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Copie manualmente: " + url,
        variant: "destructive",
      });
    }
  };

  const Icon = copied ? Check : Copy;
  const label = status === "published" ? "Copiar link" : "Copiar link do rascunho";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={label}
        aria-label={label}
        className={cn(
          "text-brand-text-muted hover:text-brand-gold transition-colors",
          copied && "text-brand-gold",
          className,
        )}
      >
        <Icon className="size-4" />
      </button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleCopy} 
      className={cn("font-medium", className)}
    >
      <Icon className="size-3.5 mr-1.5" />
      <span className="text-sm">{copied ? "Copiado!" : label}</span>
    </Button>
  );
}