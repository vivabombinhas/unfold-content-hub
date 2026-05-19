
# Plano: URLs estruturadas + slug editável

## Objetivo
Migrar de `/p/{slug-único}` para `/protocolo-batel/{procedimento}/em-{cidade}/{modificador?}/`, com campos editáveis no painel, validação, geração automática e **redirect 301** das URLs antigas para não perder SEO.

---

## 1. Mudanças no banco

Adicionar à tabela `pages`:
- `categoria` (text, default `'protocolo-batel'`)
- `procedimento` (text, obrigatório, ex: `bioestimuladores`)
- `cidade` (text, obrigatório, ex: `curitiba`)
- `modificador` (text, opcional, ex: `flacidez` ou `para-mulheres-ate-35-anos`)
- `modificador_tipo` (enum opcional: `publico` | `indicacao` | `objetivo` | `area-corporal`)
- `url_path` (text, único, gerado/persistido) — caminho completo final, ex: `protocolo-batel/bioestimuladores/em-curitiba/flacidez`
- `slug_override` (boolean) — quando `true`, o admin editou manualmente e a regra automática não sobrescreve

Nova tabela `slug_redirects`:
- `old_path` (text, único)
- `page_id` (uuid → pages)
- `created_at`
- RLS: leitura pública, escrita admin

Trigger: ao salvar `pages`, se o `url_path` mudou, insere o antigo em `slug_redirects` automaticamente (nunca perde URL indexada).

Migração de dados: para cada página existente, deduzir `procedimento` do `slug` atual, preencher `cidade='curitiba'` como default, `modificador=null`, e popular `url_path`. O `slug` antigo vai pra `slug_redirects`.

## 2. Roteamento

`src/App.tsx`:
- Manter `/p/:slug` como rota **legada** que faz lookup em `slug_redirects` → 301 client-side (`<Navigate replace>`) para o novo `url_path`.
- Adicionar rota catch-all `/:categoria/:procedimento/:cidadeSegment/:modificador?` que carrega `PublicPage`.
- `PublicPage` busca por `url_path` em vez de `slug`.
- Página não encontrada também consulta `slug_redirects` antes de mostrar 404.

## 3. Painel admin (PageEditor)

Nova seção "URL da página" com:
- Campo **Procedimento** (input + sugestão a partir do título)
- Campo **Cidade** (input, default "curitiba")
- Campo **Modificador** (input opcional)
- Select **Tipo de modificador** (público / indicação / objetivo / área corporal) — só aparece se modificador preenchido; controla qual schema.org é emitido
- Preview da URL final em tempo real: `meusite.com.br/protocolo-batel/bioestimuladores/em-curitiba/flacidez/`
- Toggle **"Editar manualmente"** → libera input livre do `url_path` completo (ativa `slug_override=true`)
- Validação Zod: cada segmento `^[a-z0-9-]+$`, sem acento, sem espaço, sem reservados (`admin`, `api`, `p`, `auth`)
- Aviso visual quando salvar muda o `url_path`: "A URL antiga será redirecionada automaticamente (301)"

No wizard de criação nova: mesma UI, mesma validação.

## 4. SSR e SEO

`render-page` edge function:
- Aceita `?path=protocolo-batel/...` além do `?slug=` legado
- Canonical usa `url_path` completo
- Schema dinâmico por `modificador_tipo`:
  - `publico` → adiciona `Audience` no MedicalProcedure
  - `indicacao` → adiciona `MedicalCondition`
  - `area-corporal` → adiciona `bodyLocation`
  - `objetivo` → adiciona `purpose`
- Breadcrumb schema automático com os 3-4 segmentos

`sitemap` edge function:
- Trocar `${baseUrl}/${page.slug}/` por `${baseUrl}/${page.url_path}/`
- Não inclui redirects antigos (eles ficam fora do sitemap, só servem 301)

`SEO.tsx`: passar `url_path` em vez de `slug` no canonical.

## 5. ControlTower

Atualizar coluna URL para mostrar o `url_path` novo. Listagem de páginas (`PagesList`) idem. `CopyLinkButton` recebe `url_path` em vez de `slug`.

## 6. Ordem de execução

1. Migration: novas colunas, tabela `slug_redirects`, trigger, backfill das páginas existentes (categoria=`protocolo-batel`, cidade=`curitiba`, procedimento=slug atual, url_path montado, slug antigo no redirects).
2. Roteamento novo + lookup de redirects.
3. UI do PageEditor com validação Zod.
4. Wizard de criação (gera os campos automaticamente do título do tópico).
5. SSR/sitemap/canonical atualizados.
6. Listagens e ControlTower atualizados.
7. QA: testar uma página migrada acessando o link antigo (`/p/diamantacao-labial`) e confirmando 301 → novo path.

## Detalhes técnicos

- `url_path` é **persistido** (não calculado on-the-fly) para permitir índice único e busca rápida.
- Reservar segmentos top-level: `admin`, `api`, `p`, `auth`, `assets` — bloquear como `categoria` ou `procedimento`.
- O slug "modelo" continua intocável (protegido pelo trigger existente).
- Trigger de redirect só insere se `OLD.url_path IS DISTINCT FROM NEW.url_path` e ignora conflito de chave única (página recriada com path antigo simplesmente remove o redirect).
- 301 client-side via React Router é suficiente para SEO porque o canonical correto está no HTML; bots seguem o canonical. Não precisamos de redirect no nível de hosting.
- Não tocar em `extract-page-images`, `generate-page-from-topic` (lógica de conteúdo) nem `render-page` compliance guard — só os pontos de URL.

## Fora de escopo (não fazer agora)
- Páginas-índice automáticas (`/protocolo-batel/bioestimuladores/em-curitiba/` listando modificadores). Pode vir depois.
- Mudar `categoria` para algo diferente de `protocolo-batel` (fica como enum de 1 valor por enquanto).
- Internacionalização ou outras cidades além de Curitiba (estrutura já suporta, mas migration assume Curitiba como default).
