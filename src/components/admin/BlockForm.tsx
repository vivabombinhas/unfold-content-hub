import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaInput } from "./MediaInput";
import { Plus, Trash2 } from "lucide-react";
import type { BlockType } from "@/types/blocks";

/**
 * Editor declarativo de blocos. Cada tipo tem campos próprios.
 * `data` é um objeto livre — o componente confia no shape esperado por tipo.
 */
interface Props {
  type: BlockType;
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

function field(value: unknown, fallback: string = ""): string {
  return typeof value === "string" ? value : fallback;
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function BlockForm({ type, data, onChange }: Props) {
  function set<K extends string>(key: K, value: unknown) {
    onChange({ ...data, [key]: value });
  }

  switch (type) {
    case "hero":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <FieldArea label="Título (HTML, use <em> para itálico dourado)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} rows={3} />
          <FieldArea label="Parágrafo" value={field(data.paragraph)} onChange={(v) => set("paragraph", v)} rows={4} />
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
          <MediaInput label="Imagem hero" value={field(data.image_url)} onChange={(v) => set("image_url", v)} />
          <Field label="Caption (linha de cima)" value={field(data.caption_top)} onChange={(v) => set("caption_top", v)} />
          <Field label="Caption (linha de baixo)" value={field(data.caption_bottom)} onChange={(v) => set("caption_bottom", v)} />
          <Field label="Footnote" value={field(data.footnote)} onChange={(v) => set("footnote", v)} />
        </div>
      );

    case "authority_strip": {
      const items = arr<{ label: string; value: string }>(data.items);
      return (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input value={it.value ?? ""} placeholder="Valor (30)" onChange={(e) => {
                const next = [...items]; next[i] = { ...it, value: e.target.value }; set("items", next);
              }} />
              <Input value={it.label ?? ""} placeholder="Label (Anos)" onChange={(e) => {
                const next = [...items]; next[i] = { ...it, label: e.target.value }; set("items", next);
              }} />
              <Button size="icon" variant="ghost" onClick={() => set("items", items.filter((_, idx) => idx !== i))}>
                <Trash2 className="size-4 text-brand-bordeaux" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("items", [...items, { label: "", value: "" }])}>
            <Plus className="size-3.5 mr-1" /> Adicionar selo
          </Button>
        </div>
      );
    }

    case "manifesto_curto":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <FieldArea label="Citação curta (HTML)" value={field(data.quote_html)} onChange={(v) => set("quote_html", v)} rows={5} />
          <Field label="Autor" value={field(data.author)} onChange={(v) => set("author", v)} />
          <FieldArea label="Texto longo (side-sheet)" value={field(data.long_text)} onChange={(v) => set("long_text", v)} rows={8} />
          <Field label="Label do botão" value={field(data.cta_label)} onChange={(v) => set("cta_label", v)} />
        </div>
      );

    case "metodo": {
      const steps = arr<{ title: string; summary: string; detail: string }>(data.steps);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-brand-text-muted">Passo {i + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => set("steps", steps.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
                <Input placeholder="Título" value={s.title ?? ""} onChange={(e) => { const n = [...steps]; n[i] = { ...s, title: e.target.value }; set("steps", n); }} />
                <Input placeholder="Resumo" value={s.summary ?? ""} onChange={(e) => { const n = [...steps]; n[i] = { ...s, summary: e.target.value }; set("steps", n); }} />
                <Textarea placeholder="Detalhe (acordeão)" rows={3} value={s.detail ?? ""} onChange={(e) => { const n = [...steps]; n[i] = { ...s, detail: e.target.value }; set("steps", n); }} />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set("steps", [...steps, { title: "", summary: "", detail: "" }])}>
              <Plus className="size-3.5 mr-1" /> Adicionar passo
            </Button>
          </div>
        </div>
      );
    }

    case "casos":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <Field label="Quantos casos exibir em destaque" value={String(data.show_count ?? 6)} onChange={(v) => set("show_count", parseInt(v) || 6)} />
          <p className="text-xs text-brand-text-muted">
            Os casos vêm do pool global. Edite-os em <strong>Casos clínicos</strong> no menu.
            A seleção por página entra na rodada 2B.
          </p>
        </div>
      );

    case "preco_ancora": {
      const bullets = arr<string>(data.bullets);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <FieldArea label="Descrição" value={field(data.description)} onChange={(v) => set("description", v)} rows={3} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Bullets do que está incluso</p>
            <div className="space-y-2">
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={b} onChange={(e) => { const n = [...bullets]; n[i] = e.target.value; set("bullets", n); }} />
                  <Button size="icon" variant="ghost" onClick={() => set("bullets", bullets.filter((_, idx) => idx !== i))}>
                    <Trash2 className="size-4 text-brand-bordeaux" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("bullets", [...bullets, ""])}>
                <Plus className="size-3.5 mr-1" /> Adicionar bullet
              </Button>
            </div>
          </div>
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
          <Field label="Título do side-sheet" value={field(data.sheet_title)} onChange={(v) => set("sheet_title", v)} />
          <FieldArea label="Conteúdo do side-sheet (HTML simples)" value={field(data.sheet_html)} onChange={(v) => set("sheet_html", v)} rows={6} />
        </div>
      );
    }

    case "depoimentos":
    case "ai_opinions":
    case "cursos":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          {type === "depoimentos" && <Field label="Quantos exibir" value={String(data.show_count ?? 5)} onChange={(v) => set("show_count", parseInt(v) || 5)} />}
          {type === "ai_opinions" && <Field label="Subtítulo" value={field(data.subtitle)} onChange={(v) => set("subtitle", v)} />}
          {type === "cursos" && (
            <>
              <FieldArea label="Intro" value={field(data.intro)} onChange={(v) => set("intro", v)} rows={3} />
              <Field label="Footnote" value={field(data.footnote)} onChange={(v) => set("footnote", v)} />
            </>
          )}
          <p className="text-xs text-brand-text-muted">
            O conteúdo dos cards vem do pool global. Edite no menu correspondente.
          </p>
        </div>
      );

    case "equipe_rt": {
      const accs = arr<{ question: string; answer: string }>(data.accordions);
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <Field label="Registro (CRBM 8242 PR)" value={field(data.register_label)} onChange={(v) => set("register_label", v)} />
          <MediaInput label="Foto" value={field(data.image_url)} onChange={(v) => set("image_url", v)} />
          <FieldArea label="Bio" value={field(data.bio)} onChange={(v) => set("bio", v)} rows={4} />
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-2">Acordeões</p>
            <div className="space-y-3">
              {accs.map((a, i) => (
                <div key={i} className="border border-brand-gold/15 p-3 space-y-2">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("accordions", accs.filter((_, idx) => idx !== i))}>
                      <Trash2 className="size-4 text-brand-bordeaux" />
                    </Button>
                  </div>
                  <Input placeholder="Pergunta" value={a.question ?? ""} onChange={(e) => { const n = [...accs]; n[i] = { ...a, question: e.target.value }; set("accordions", n); }} />
                  <Textarea placeholder="Resposta" rows={3} value={a.answer ?? ""} onChange={(e) => { const n = [...accs]; n[i] = { ...a, answer: e.target.value }; set("accordions", n); }} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("accordions", [...accs, { question: "", answer: "" }])}>
                <Plus className="size-3.5 mr-1" /> Adicionar acordeão
              </Button>
            </div>
          </div>
          <Field label="Label do botão" value={field(data.cta_label)} onChange={(v) => set("cta_label", v)} />
        </div>
      );
    }

    case "faq":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <p className="text-xs text-brand-text-muted">
            As perguntas vêm do pool global. Marque a flag <strong>destacada</strong> nas FAQs
            que devem aparecer antes do botão "Ver todas".
          </p>
        </div>
      );

    case "cta_final":
      return (
        <div className="space-y-4">
          <Field label="Eyebrow" value={field(data.eyebrow)} onChange={(v) => set("eyebrow", v)} />
          <Field label="Título (HTML)" value={field(data.title_html)} onChange={(v) => set("title_html", v)} />
          <FieldArea label="Parágrafo" value={field(data.paragraph)} onChange={(v) => set("paragraph", v)} rows={3} />
          <CtaField label="CTA primário" value={data.cta_primary} onChange={(v) => set("cta_primary", v)} />
          <CtaField label="CTA secundário" value={data.cta_secondary} onChange={(v) => set("cta_secondary", v)} />
        </div>
      );
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CtaField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: { label: string; href?: string; opens_sheet?: boolean }) => void }) {
  const v = obj(value) as { label?: string; href?: string; opens_sheet?: boolean };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-brand-text-muted">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Texto do botão" value={v.label ?? ""} onChange={(e) => onChange({ ...v, label: e.target.value })} />
        <Input placeholder="Link (https://… ou #ancora)" value={v.href ?? ""} onChange={(e) => onChange({ ...v, href: e.target.value })} />
      </div>
    </div>
  );
}