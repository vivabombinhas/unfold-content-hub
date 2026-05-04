// Tipos compartilhados dos blocos da página.
// Cada `data` segue uma forma específica por `type`, mas no banco vive como jsonb.

export type BlockType =
  | "hero"
  | "authority_strip"
  | "manifesto_curto"
  | "metodo"
  | "procedimento_detalhado"
  | "casos"
  | "preco_ancora"
  | "depoimentos"
  | "ai_opinions"
  | "equipe_rt"
  | "cursos"
   | "faq"
   | "cta_final"
   | "beneficios_grid"
   | "procedimento_detalhado_v2";

export type BlockMode = "structured" | "html";

export interface PageBlockRow {
  id: string;
  page_id: string;
  type: BlockType;
  position: number;
  enabled: boolean;
  mode: BlockMode;
  data: Record<string, unknown>;
  html_content: string | null;
}

export interface PageRow {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  status: "draft" | "published";
  published_snapshot: {
    page: { slug: string; title: string; meta_title: string | null; meta_description: string | null };
    blocks: PageBlockRow[];
  } | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Friendly labels per block type — used in admin UI.
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  authority_strip: "Faixa de autoridade",
  manifesto_curto: "Manifesto",
  metodo: "Método em passos",
  procedimento_detalhado: "Procedimento detalhado (opcional)",
  casos: "Casos clínicos",
  preco_ancora: "Preço-âncora",
  depoimentos: "Depoimentos / Google Reviews",
  ai_opinions: "O que as IAs dizem",
  equipe_rt: "Responsável técnica",
  cursos: "Cursos e mentorias",
  faq: "Perguntas frequentes",
  cta_final: "CTA final",
  beneficios_grid: "Grid de benefícios (Premium)",
  procedimento_detalhado_v2: "Procedimento detalhado v2 (Premium)",
};