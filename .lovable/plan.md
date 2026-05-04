
# Diagnóstico do CRM + plano de correção

Este é um documento de diagnóstico e plano. **Nenhuma alteração será feita até você aprovar.** Ignora segurança/RLS/auth conforme pedido.

---

## 1. Diagnóstico real — o que aconteceu com Diamantação Labial

Consultei o banco direto. O registro de `diamantacao-labial` tem:

```text
reference_type     = "none"
links_referencia   = []         (vazio)
own_old_page       = null       (não marcado)
old_page_extracted = null       (extração nunca rodou)
old_page_images    = 0
```

**Causa raiz #1 — a extração nunca rodou.** O formulário foi submetido sem a URL antiga e sem o checkbox "página antiga da própria clínica". Isso pode ter sido por dois motivos:

- (a) O usuário testou na URL **publicada** (`unfold-content-hub.lovable.app`), que ainda servia a versão pré-Fase 1.2 — sem checkbox, sem campo de notas, sem fluxo de extração. O código novo só está no preview.
- (b) Mesmo no preview, o checkbox está **desabilitado quando o textarea de links está vazio** (`disabled={... || linksRaw.trim().length === 0}`). É fácil submeter sem perceber que ele não foi marcado.

**Consequência em cadeia:**
- Firecrawl nunca foi chamado para `https://esteticabatel.com.br/diamantacao-labial/`. Não há resposta a "voltou markdown? html? imagens?" — a chamada simplesmente não aconteceu.
- `old_page_content` ficou vazio.
- O gerador caiu no fallback "tema novo": IA escreveu copy do zero a partir de pesquisa web genérica → respostas inventadas (12-18 meses de cor/brilho ≠ 6-12 meses de duração real).
- `procedimento_detalhado` nasceu **disabled** porque depende de uma seção forte vinda da página antiga (regra em `generate-page-from-topic` linha 500: `enabled = !!procedimentoDetalhadoData`).
- Depoimentos e FAQs caíram no pool global (ainda contaminado com Botox).
- Imagens candidatas: zero — porque scrape não rodou.

**Causa raiz #2 — UX do formulário não força o caminho certo.** Não há indicador visual claro de "modo página antiga ativo", nem validação que avise "você forneceu URL mas não marcou o checkbox". O usuário pensa que extraiu, mas extraiu nada.

**Causa raiz #3 — fallback é silencioso.** Quando a extração não acontece ou falha, o gerador segue em frente e produz uma página parecendo legítima. Não há aviso "atenção: nenhum conteúdo da clínica foi preservado, esta página é 100% IA".

**Causa raiz #4 — pool global de depoimentos/FAQs ainda só tem entradas de Botox.** Quando o gerador não tem `ownTestimonials`, ele cai no pool — e o pool é mono-procedimento.

---

## 2. Estado real dos blocos e rotas do admin

### Bloco `procedimento_detalhado`
- ✓ Está no enum `block_type` (migration confirmada).
- ✓ Está no `BlockRenderer.tsx` (linha 104).
- ✓ Está no `BlockForm.tsx` (linha 292).
- ✓ Está no `Index.tsx` (linha 109 — mas como `() => null`, ou seja, **não renderiza no Index** que é o site de produção do botox).
- ✗ Vem **disabled** quando não há seção forte da página antiga → no editor aparece como card desligado, sem dados, parece "vazio e quebrado".

### Rotas do menu admin
O `AdminLayout.tsx` lista 8 itens de menu. O `App.tsx` registra apenas:
- `/admin` (dashboard) ✓
- `/admin/paginas` ✓
- `/admin/paginas/nova` ✓
- `/admin/paginas/:slug` ✓

**Faltam 6 rotas** (rotas existem no menu, componentes não existem):

| Menu | Rota esperada | Tabela existe? | Componente |
|---|---|---|---|
| Casos clínicos | `/admin/casos` | `cases` ✓ | falta criar |
| Perguntas (FAQ) | `/admin/faqs` | `faqs` ✓ | falta criar |
| Depoimentos | `/admin/depoimentos` | `reviews` ✓ | falta criar |
| Opiniões de IAs | `/admin/ia-opinions` | `ai_opinions` ✓ | falta criar |
| Cursos | `/admin/cursos` | `courses` ✓ | falta criar |
| Configurações | `/admin/configuracoes` | `site_settings` ✓ | falta criar |

Todas as tabelas têm RLS já correta (admin manage / public read). É só CRUD UI.

---

## 3. Plano de correção em fases

### Fase A — Confiabilidade do fluxo "página antiga" (PRIORIDADE 1)

Sem isso o CRM não serve para produzir páginas reais.

1. **Detecção automática de URL própria**: se algum link em `linksRaw` for do domínio `esteticabatel.com.br`, marca o checkbox sozinho e mostra badge "Detectado: página da clínica".
2. **Validação dura no submit**: se `linksRaw` tem URL E o checkbox NÃO está marcado, mostra modal "Você quer reaproveitar conteúdo desta página antiga? Sim / Não, é só inspiração". Sem isso o submit não avança.
3. **Logging visível da extração**: durante "Pesquisando…" mostrar em tempo real:
   - "Acessando https://… → 200 OK / 12 KB markdown / 8 imagens"
   - "Extraídos: 18 FAQs, 4 depoimentos, 3 seções"
   - Se vier zero: aviso vermelho "A página antiga não retornou conteúdo. Possíveis motivos: bloqueio anti-bot, lazy-load JS, paywall. Você quer prosseguir mesmo assim?"
4. **Bloquear geração quando extração falhar e checkbox estava marcado**, a menos que o usuário confirme explicitamente "gerar com IA pura".
5. **Persistir o conteúdo extraído cru no `pages.metadata`** (`old_page_raw_markdown`, `old_page_raw_html`, `old_page_extracted`) — assim mesmo após erros é possível re-gerar sem chamar Firecrawl de novo.

**Arquivos afetados:**
- `src/pages/admin/NewPageFromTopic.tsx` (UX, validação, progresso)
- `supabase/functions/research-topic/index.ts` (retornar diagnósticos detalhados, salvar markdown cru)
- `supabase/functions/generate-page-from-topic/index.ts` (bloquear geração silenciosa)

### Fase B — IA que não inventa

1. **Prompt de extração mais agressivo**: instrução "se a página tem N FAQs, retorne N FAQs literais — sem reescrever, sem 'melhorar', sem cortar". Aumentar limite para 25 FAQs e 15 depoimentos.
2. **Prompt do gerador com regra dura**: "Quando `old_page_content.faqs.length > 0`, use APENAS essas FAQs. Não invente nem complemente. Mesma regra para depoimentos."
3. **Validador pós-geração**: comparar respostas geradas com o markdown cru. Se uma resposta de FAQ contém número/duração que não existe no markdown original, marcar como "verificar" no editor.
4. **Quarentena anti-Botox**: filtro hard que bloqueia mensão a "botox/toxina" em páginas cujo `area_anatomica !== 'terco_superior'`. Se IA gerar, regenera 1x ou apaga o trecho.

**Arquivos afetados:**
- `supabase/functions/research-topic/index.ts` (prompt extração)
- `supabase/functions/generate-page-from-topic/index.ts` (prompt gerador, validador, filtro)

### Fase C — Bloco `procedimento_detalhado` realmente funcional

1. Quando criado disabled mas com `paragraphs=[]`, o editor deve mostrar **botão grande "Ativar e preencher"** ao invés de aparecer vazio.
2. Painel de edição com lista editável de parágrafos + bullets + side-sheet opcional.
3. Adicionar ao `Index.tsx` o componente real (hoje renderiza `null`) — caso a página `botox-masculino` decida usar.
4. No fluxo de geração, **sempre** criar o bloco com pelo menos um parágrafo (mesmo gerado por IA), enabled=false por padrão, para o admin decidir ativar.

**Arquivos afetados:**
- `src/components/admin/BlockForm.tsx`
- `src/components/site/BlockRenderer.tsx` (já tem)
- `src/pages/Index.tsx`
- `supabase/functions/generate-page-from-topic/index.ts`

### Fase D — Imagens candidatas confiáveis

1. Já temos extração via regex de `<img src>`. Adicionar:
   - Extração de `<source srcset>` (responsive images)
   - Extração de `style="background-image:url(…)"` inline
   - Extração de `data-src`, `data-lazy-src`, `data-original` (lazy-load comum)
2. Usar Firecrawl com `formats: ["html","screenshot","links"]` e `waitFor: 3000` para JS hidratar.
3. Filtros: pular logos/icons/avatars (heurística por dimensão se disponível, ou por path `/logo`, `/icon`).
4. Painel "Imagens da página antiga" no editor: grid com cada imagem, preview, botão "Usar no Hero / Caso / Galeria".
5. **Fallback manual**: textarea "Cole URLs de imagens (uma por linha)" no formulário inicial e no editor — independente de scraping.

**Arquivos afetados:**
- `supabase/functions/research-topic/index.ts` (extractor robusto)
- `src/pages/admin/PageEditor.tsx` (painel imagens)
- `src/pages/admin/NewPageFromTopic.tsx` (fallback manual)

### Fase E — Depoimentos/FAQs por página (não só pool global)

Hoje o gerador injeta `ownTestimonials` direto no `data` do bloco, mas é tudo ou nada e não fica editável de forma estruturada.

1. **Nova tabela `page_reviews`** (depoimentos vinculados à página) e **nova tabela `page_faqs`** (FAQs vinculadas à página). Schema espelha `reviews`/`faqs` + `page_id`.
2. Gerador grava extraídos nessas tabelas, não no JSON do bloco.
3. Bloco `depoimentos` e `faq` ganham toggle "fonte: pool global / desta página / ambos".
4. CRUD desses subconjuntos direto na tela do editor (acordeão "Depoimentos desta página (4)").
5. Migração de dados existentes não precisa — só `diamantacao-labial` está afetada e será regerada.

**Arquivos afetados:**
- migration nova (2 tabelas + RLS espelhada)
- `src/components/site/BlockRenderer.tsx` (DepoimentosBlock, FaqBlock)
- `src/components/admin/BlockForm.tsx`
- `supabase/functions/generate-page-from-topic/index.ts`
- `src/pages/admin/PageEditor.tsx`

### Fase F — Rotas admin que faltam (CRUD dos pools)

Implementar em ordem de uso:

1. `/admin/configuracoes` (rápido, 1 linha em `site_settings`)
2. `/admin/depoimentos` (entender padrão de CRUD)
3. `/admin/faqs`
4. `/admin/casos` (mais complexo: galeria, antes/depois)
5. `/admin/ia-opinions`
6. `/admin/cursos`

Padrão único: lista (table) → drawer/modal de edição (react-hook-form + zod) → reorder (dnd-kit) → soft delete opcional.

**Arquivos afetados:** 6 novos componentes em `src/pages/admin/` + rotas em `App.tsx`.

### Fase G — IA premium opcional

Hoje só `LOVABLE_API_KEY` (Gemini Flash). Proposta:

1. **Tabela `ai_models`** ou config em `site_settings.data.ai`: lista de modelos disponíveis com label e tier (`fast` / `quality` / `editorial`).
2. **Secrets opcionais** — usar tools `secrets--fetch_secrets` para checar e se faltar pedir via `add_secret`:
   - `OPENAI_API_KEY` (gpt-5, gpt-5-mini)
   - `ANTHROPIC_API_KEY` (claude-sonnet, claude-opus)
3. **Roteador no edge function**: olha tier escolhido → escolhe provider → chama API correta. Lovable AI Gateway continua como fallback se a key premium falhar.
4. **Seleção no admin**: na tela "Nova página" adicionar select "Qualidade da IA" (rápido / alta / editorial premium). Salva preferência por sessão.
5. **Tela "Revisão editorial"**: depois da geração, botão "Revisar com modelo premium" que regera apenas blocos selecionados.

**Arquivos afetados:**
- migration (config)
- novo `supabase/functions/_shared/ai-router.ts`
- `supabase/functions/generate-page-from-topic/index.ts`, `improve-block-text/index.ts`, `research-topic/index.ts`
- `src/pages/admin/NewPageFromTopic.tsx`
- `src/pages/admin/PageEditor.tsx`

### Fase H — Importador de blocos de páginas de referência

Cenário "Nosso Diferencial na Diamantação Labial".

1. Nova rota `/admin/paginas/:slug/importar` (acessível via botão "+ Importar bloco" no editor).
2. Input: URL.
3. Edge function `import-blocks-from-url`:
   - Firecrawl scrape (markdown + html)
   - IA divide em "seções candidatas" com `{title, body, suggested_block_type, screenshot_hint}`
4. Galeria de seções → admin escolhe → vira `page_block` no padrão visual novo (mesmo `BlockRenderer` aplicado a `data` mapeado).
5. Mapeamento de tipos: "diferenciais" → bloco `metodo` ou `procedimento_detalhado`; "depoimentos" → injeta em `page_reviews`; "preço" → `preco_ancora`; etc.

**Arquivos afetados:**
- nova edge function `import-blocks-from-url`
- nova página admin
- atualização do editor para botão "+ Importar"

---

## 4. Ordem recomendada de execução

```text
Sprint 1 (essencial — sem isso o CRM continua não-funcional)
  Fase A  Confiabilidade do fluxo página antiga
  Fase B  IA que não inventa
  Fase C  Bloco procedimento_detalhado funcional

Sprint 2 (qualidade de conteúdo)
  Fase D  Imagens candidatas robustas
  Fase E  Depoimentos/FAQs por página

Sprint 3 (completar admin)
  Fase F  6 CRUDs faltando

Sprint 4 (premium e escala)
  Fase G  IA premium com seleção de modelo
  Fase H  Importador de blocos
```

Após Sprint 1: re-testar Diamantação Labial. Critério de sucesso = todas as 20+ FAQs reais aparecem literalmente, depoimentos reais aparecem, zero mensão a Botox, `procedimento_detalhado` editável e ativável.

---

## 5. Riscos

- **Firecrawl pode falhar em sites protegidos** (Cloudflare, Wordfence). Mitigação: fallback manual de URLs/textos colados + persistir markdown cru para re-tentativa.
- **Custos de IA premium**: GPT-5 e Claude Opus são caros. Mitigação: usar tier "editorial" só sob demanda explícita do usuário, não em geração inicial.
- **Validador de invenção pode dar falso positivo** e bloquear conteúdo legítimo. Mitigação: validador só sinaliza, não bloqueia; admin decide.
- **Migração `page_reviews`/`page_faqs`** precisa de RLS espelhada de `reviews`/`faqs`. Sem isso, leitura pública quebra.
- **Bloco `procedimento_detalhado` no Index real**: hoje renderiza null para não quebrar Botox. Precisa de teste antes de ativar para evitar regressão.
- **Modelos premium novos** (gpt-5.2, gemini-3) precisam ser testados em prompts existentes — formato de tool calling pode variar.

---

## 6. Fluxo ideal de criação de página (pós-Sprint 1+2)

```text
1. Admin → "+ Nova página"
2. Tema + slug + URL antiga (auto-detecta domínio próprio)
3. Sistema mostra:
   "Detectado: página da clínica. Vou preservar conteúdo real."
4. Pesquisa Firecrawl com diagnóstico ao vivo:
   ✓ markdown 14KB · 18 FAQs · 6 depoimentos · 11 imagens
5. Geração com travas anti-invenção
6. Editor abre com:
   - Hero pré-preenchido (imagem da página antiga sugerida)
   - Bloco procedimento_detalhado ATIVO com seção real
   - FAQs literais marcadas "vinda da página antiga"
   - Depoimentos reais marcados "página antiga", pool desligado
   - Painel lateral "11 imagens da página antiga" → arrastar para blocos
   - Painel lateral "Importar bloco de outra URL"
7. Admin revisa, ajusta, escolhe "Revisão editorial premium" se quiser
8. Publica
```

Este é o padrão a alcançar. Quando aprovar, começo pela **Fase A**.
