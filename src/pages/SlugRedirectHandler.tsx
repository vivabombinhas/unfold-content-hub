import { useEffect, useState } from "react";
import { useLocation, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrlPath } from "@/lib/url-path";

/**
 * Captura qualquer URL que não bate com rotas declaradas e tenta:
 *  1. Buscar página com `url_path` igual ao caminho atual → renderiza
 *  2. Buscar redirect (`old_path`) → redireciona para o url_path novo
 *  3. Caso contrário, mostra 404
 *
 * Funciona como SPA-fallback: o JS executa do lado do cliente, mas
 * o canonical do HTML já vai correto, então o Google segue o canonical.
 */

import PublicPage from "./PublicPage";
import NotFound from "./NotFound";

type ResolveResult =
  | { kind: "loading" }
  | { kind: "page"; slug: string }
  | { kind: "redirect"; target: string }
  | { kind: "notfound" };

export default function SlugRedirectHandler() {
  const location = useLocation();
  const path = normalizeUrlPath(location.pathname);
  const [state, setState] = useState<ResolveResult>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // 1) Match direto por url_path
      const { data: page } = await supabase
        .from("pages")
        .select("slug, url_path")
        .eq("url_path", path)
        .maybeSingle();

      if (cancelled) return;
      if (page) {
        setState({ kind: "page", slug: (page as any).slug });
        return;
      }

      // 2) Match em slug_redirects
      const { data: redirect } = await supabase
        .from("slug_redirects" as any)
        .select("page_id, pages:page_id(url_path)")
        .eq("old_path", path)
        .maybeSingle();

      if (cancelled) return;
      const target = (redirect as any)?.pages?.url_path;
      if (target) {
        setState({ kind: "redirect", target: `/${target}` });
        return;
      }

      // 3) Fallback legado: tentar match por slug raiz (último segmento)
      const lastSeg = path.split("/").pop() || "";
      if (lastSeg && lastSeg !== path) {
        const { data: legacy } = await supabase
          .from("pages")
          .select("url_path")
          .eq("slug", lastSeg)
          .maybeSingle();
        if (!cancelled && legacy) {
          setState({ kind: "redirect", target: `/${(legacy as any).url_path}` });
          return;
        }
      }

      setState({ kind: "notfound" });
    }

    setState({ kind: "loading" });
    resolve();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="w-10 h-10 border-t-2 border-brand-gold rounded-full animate-spin" />
      </div>
    );
  }
  if (state.kind === "redirect") {
    return <Navigate to={state.target} replace />;
  }
  if (state.kind === "page") {
    return <PublicPage slugOverride={state.slug} />;
  }
  return <NotFound />;
}