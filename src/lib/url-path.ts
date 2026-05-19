/**
 * Helpers para a estrutura de URL hierárquica das páginas:
 *   /{categoria}/{procedimento}/em-{cidade}/{modificador?}
 *
 * O `url_path` persistido NÃO inclui o prefixo "em-" da cidade —
 * essa decoração é só na URL pública. No banco salvamos exatamente
 * como aparece na URL para casar 1:1.
 */

const RESERVED = ["admin", "api", "p", "auth", "assets", "lovable", "static"];
const SEGMENT_RE = /^[a-z0-9-]+$/;

export function slugifySegment(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface UrlParts {
  categoria: string;
  procedimento: string;
  cidade: string;
  modificador?: string | null;
}

export function buildUrlPath(parts: UrlParts): string {
  const cat = parts.categoria || "protocolo-batel";
  const cid = parts.cidade || "curitiba";
  const base = `${cat}/${parts.procedimento}/em-${cid}`;
  if (parts.modificador && parts.modificador.trim()) {
    return `${base}/${parts.modificador}`;
  }
  return base;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateUrlParts(parts: UrlParts): ValidationError[] {
  const errors: ValidationError[] = [];
  const check = (field: keyof UrlParts, value: string | null | undefined, required: boolean) => {
    if (!value) {
      if (required) errors.push({ field, message: `${field} é obrigatório` });
      return;
    }
    if (!SEGMENT_RE.test(value)) {
      errors.push({ field, message: `${field}: use apenas letras minúsculas, números e hífen` });
    }
    if (RESERVED.includes(value) && !(field === "categoria" && value === "protocolo-batel")) {
      errors.push({ field, message: `${field}: "${value}" é reservado` });
    }
  };
  check("categoria", parts.categoria, true);
  check("procedimento", parts.procedimento, true);
  check("cidade", parts.cidade, true);
  check("modificador", parts.modificador, false);
  return errors;
}

/**
 * Reconstrói o url_path canônico a partir de qualquer caminho que o
 * usuário acesse (com ou sem barra final, com ou sem prefixo). Usado
 * pelo PublicPage para fazer lookup no banco.
 */
export function normalizeUrlPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}