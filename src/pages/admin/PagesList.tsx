import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PagesList() {
  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-brand-text-light">Páginas</h1>
          <p className="text-sm text-brand-text-muted mt-1">Edite o conteúdo de cada landing.</p>
        </div>
        <span className="text-xs text-brand-text-muted">
          Criar páginas novas chega na próxima rodada (2B).
        </span>
      </div>

      {isLoading ? (
        <p className="text-brand-text-muted">Carregando…</p>
      ) : (
        <div className="border border-brand-gold/15 bg-brand-graphite/20">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.2em] text-brand-text-muted border-b border-brand-gold/15">
              <tr>
                <th className="px-5 py-3">Título</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Atualizada</th>
                <th className="px-5 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {pages?.map((p) => (
                <tr key={p.id} className="border-t border-brand-gold/10 hover:bg-brand-graphite/30">
                  <td className="px-5 py-3 text-brand-text-light">{p.title}</td>
                  <td className="px-5 py-3 text-brand-text-muted font-mono text-xs">/p/{p.slug}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className={p.status === "published" ? "bg-brand-gold/20 text-brand-gold border-brand-gold/30" : ""}>
                      {p.status === "published" ? "Publicada" : "Rascunho"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-brand-text-muted text-xs">
                    {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`/?preview=${p.slug}`}
                        target="_blank"
                        className="text-brand-text-muted hover:text-brand-gold"
                        title="Ver no site"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <Link
                        to={`/admin/paginas/${p.slug}`}
                        className="text-brand-gold hover:underline inline-flex items-center gap-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}