# Plano: Arquitetura SSR Híbrida Definitiva

## 1. Recomendação final

**Seguir com SSR híbrido baseado em Edge Function + hidratação seletiva.**

Justificativa: o stack atual (Vite + React Router + Supabase) não suporta SSR nativo sem migração para Next/Remix (alto risco). A abordagem híbrida preserva 100% do CRM/editor atual e adiciona uma camada de renderização server-side **somente** para rotas públicas. O MVP já provou viabilidade técnica.

---

## 2. Arquitetura proposta

```text
                    ┌─────────────────────────────────┐
   Request          │  Cloudflare (Edge / CDN)        │
   /slug ─────────► │  - Cache HTML por slug          │
                    │  - Roteamento por path          │
                    └──────────────┬──────────────────┘
                                   │
                ┌──────────────────┼─────────────────────┐
                │                  │                     │
                ▼                  ▼                     ▼
        /admin/* /login/*    /:slug (público)     /assets, /api
        Pass-through         Edge Function        Pass-through
        para SPA             render-page          (SPA bundle)
        (index.html)         (HTML completo)
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │  Browser recebe HTML pronto     │
                    │  + bundle React carrega depois  │
                    │  + hidratação seletiva (islands)│
                    └─────────────────────────────────┘
```

### Separação de responsabilidades

| Rota | Servidor | Renderização |
|------|----------|--------------|
| `/admin/*` | SPA atual | CSR (sem mudança) |
| `/login`, `/auth` | SPA atual | CSR (sem mudança) |
| `/p/:slug?preview=1` | SPA atual | CSR (preview do editor) |
| `/:slug` (público) | Edge Function | SSR + hidratação parcial |
| `/sitemap.xml` | Edge Function (já existe) | Server |
| Assets | CDN | Static |

---

## 3. Fluxo request → response

1. **Request chega no Cloudflare** com path `/diamantacao-labial`
2. **Cloudflare verifica cache** (chave: `slug + versão`). Se HIT → retorna em ~20ms.
3. **Cache MISS** → encaminha para Edge Function `render-page`.
4. **Edge Function**:
   - Busca `pages` + `page_blocks` (Supabase, com índice por slug)
   - Renderiza HTML completo (head, semântica, JSON-LD, conteúdo)
   - Inclui `<link rel="modulepreload">` para o bundle React
   - Inclui `<script>window.__PAGE_DATA__ = {...}</script>` para hidratação
   - Retorna com `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
5. **Browser renderiza HTML imediatamente** (LCP < 1s).
6. **Bundle React carrega em background** e hidrata componentes interativos sem re-fetch.
7. **Cloudflare salva no cache** para próximos visitantes.

---

## 4. Hidratação parcial (Islands)

Componentes classificados em duas categorias:

### Static (renderizados no servidor, sem JS)
- Hero (texto, imagem, CTA como `<a>`)
- Manifesto, Método, FAQ (`<details>/<summary>` nativos)
- Cursos, Equipe RT, Preço, CTA final
- Conteúdo textual, headings, listas

### Interactive (hidratam no client)
- Modais (CaseModal, SideSheet, manifesto completo)
- Carrosséis/sliders
- Before/after sliders
- Vídeos lazy-load
- FloatingCTA, Header com menu mobile
- Filtros de casos clínicos

**Estratégia:** o HTML do SSR já contém o conteúdo "fechado" (FAQ aberto via CSS, modal como link âncora). Quando o React hidratar, substitui o comportamento por interativo (progressive enhancement). Se o JS falhar, o site continua navegável e indexável.

**Editor/Media Picker:** vivem em `/admin/*`, não são tocados.

---

## 5. Estratégia de cache

| Camada | TTL | Invalidação |
|--------|-----|-------------|
| Cloudflare Edge | 1h (s-maxage), 24h SWR | Purge por tag `page:{slug}` no publish |
| Supabase Edge Function | sem cache próprio | n/a |
| Browser | 5min (max-age) | Naturalmente expira |

**Invalidação no publish:**
- Adicionar trigger no botão "Publicar" do editor que chama a Cloudflare Cache API:
  `POST /zones/{id}/purge_cache` com tag `page:{slug}` + `sitemap`.
- Sem Cloudflare: confiar no TTL curto + revalidação SWR.

---

## 6. Tratamento de blocos por tipo

| Bloco | SSR? | Notas |
|-------|------|-------|
| hero | ✅ Total | imagem com `fetchpriority=high` |
| authority_strip | ✅ Total | estático |
| manifesto_curto | ✅ + island | "ler mais" abre modal no client |
| metodo | ✅ Total | grid estático |
| casos | ✅ HTML + island | grid renderizado, modal hidrata |
| preco_ancora | ✅ + island | sheet hidrata |
| depoimentos | ✅ Total | carrossel via CSS scroll-snap |
| ai_opinions | ✅ Total | grid estático |
| equipe_rt | ✅ + island | expand hidrata |
| cursos | ✅ Total | cards estáticos |
| faq | ✅ Total | `<details>` nativo |
| cta_final | ✅ Total | links como `<a>` |
| beneficios_grid | ✅ Total | estático |
| procedimento_detalhado_v2 | ✅ Total | timeline estática |
| marquee_cards | ✅ + CSS animation | sem JS |

---

## 7. Impactos

| Área | Impacto |
|------|---------|
| **Performance** | LCP −60%, FCP −70%, TTI igual ou melhor |
| **SEO** | Conteúdo 100% indexável, rich results elegíveis |
| **AEO/LLMs** | Conteúdo lido por GPT/Gemini/Perplexity sem JS |
| **Schema.org** | Injetado server-side, sempre presente |
| **Sitemap** | Já dinâmico, sem mudança |
| **Analytics** | GTM/GA continuam no client (sem impacto) |
| **Custo Edge Function** | ~0,5ms CPU/request, dominado pela query Supabase |
| **Custo Cloudflare** | Free tier suporta o volume atual |
| **Tempo de resposta** | Cache HIT ~20ms, MISS ~150-300ms |

---

## 8. URLs futuras

Estrutura recomendada:
```text
/procedimento-batel/{slug}-em-curitiba/
```

Implementação:
1. Adicionar coluna `url_pattern` em `pages` (opcional, default `/{slug}/`)
2. Edge Function lê o pattern e gera canonical correto
3. Sitemap usa o mesmo pattern
4. Redirect 301 das URLs antigas (`/p/{slug}` → nova)
5. Cloudflare Worker handle o roteamento por path

Compatível com WordPress: o reverse proxy do Cloudflare pode rotear `/blog/*` → WordPress, `/procedimento-batel/*` → Edge Function, `/admin/*` → SPA. Sem conflito.

---

## 9. Garantias de não-quebra

O que **NÃO muda**:
- `src/pages/admin/*` — intocado
- `src/pages/PublicPage.tsx` — continua existindo para `?preview=1`
- `AdminLayout`, `use-auth`, RLS — intocados
- Editor, media picker, geração de páginas — intocados
- Bundle React, Vite config — intocados (apenas adiciona script de hidratação)
- Botão publicar — ganha 1 chamada extra (purge cache), reversível

Mecanismo de fallback:
- Se Edge Function falhar → Cloudflare serve `index.html` (SPA) como hoje
- Se Cloudflare cair → DNS aponta direto para SPA
- Feature flag `?ssr=0` força bypass do SSR para debug

---

## 10. Rollout em 4 fases

**Fase 1 — Função definitiva (1 página)**
- Renomear `render-page-test` → `render-page`
- Mapear 100% dos blocos com paridade visual (CSS inline crítico)
- Testar com `botox-para-homens`
- Validar: View Source, Lighthouse, Rich Results Test, GSC URL Inspection

**Fase 2 — Roteamento Cloudflare (1 página em produção)**
- Configurar Cloudflare Worker para rotear `/botox-para-homens` → função
- Manter resto do site no SPA
- Monitorar 7 dias: erros, performance, indexação

**Fase 3 — Expansão controlada (5 páginas)**
- Adicionar mais 4 slugs ao Worker
- Validar publish → purge cache funcional
- Comparar métricas antes/depois (GSC, GA)

**Fase 4 — Migração total**
- Worker captura todas as rotas que correspondem a slugs publicados em `pages`
- Slugs não-encontrados continuam para SPA (404 do React Router)
- Remover `/p/` legado após 30 dias e redirects 301

---

## 11. Riscos reais e mitigação

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Divergência visual SSR vs CSR | Alta | Testes visuais lado-a-lado por bloco antes do rollout |
| Cache servir conteúdo desatualizado | Média | Purge automático no publish + TTL curto |
| Edge Function timeout (Supabase 150s) | Baixa | Query única com join, índice em `slug` |
| Custo Supabase Egress | Baixa | Cache do Cloudflare absorve 95% |
| Hidratação quebrar interatividade | Média | Estratégia island por bloco, testes E2E |
| Lock-in Cloudflare | Baixa | Worker é portável (Vercel Edge, Deno Deploy) |
| Regressão no admin | Baixíssima | Admin não é tocado em nenhuma fase |

---

## 12. Pré-requisitos antes de implementar

1. Decidir host do roteamento: Cloudflare Workers (recomendado) ou Vercel Edge Middleware
2. Confirmar acesso à conta Cloudflare do domínio `esteticabatel.com.br`
3. Definir se URL final será `/{slug}/` ou `/procedimento-batel/{slug}-em-curitiba/` (afeta canonical/sitemap)
4. Lista de blocos com prioridade de paridade visual

---

## 13. Próximo passo recomendado

Após aprovação deste plano: começar pela **Fase 1** isoladamente (renomear função + paridade visual completa de 1 página), sem tocar em produção. Reavaliar antes de avançar para Fase 2.
