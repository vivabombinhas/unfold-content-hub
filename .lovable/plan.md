
# CRM Admin · Rodada 2A — Base + edição da landing atual

Vamos construir a fundação do CRM. Ao final desta rodada você consegue: fazer login, ver a lista de páginas, abrir a landing Botox Masculino no editor, ligar/desligar/reordenar blocos e editar todos os campos estruturados — com sistema de Rascunho/Publicado. **Não inclui ainda**: criar páginas novas, slot HTML cru, IA, biblioteca de mídia. Isso vem nas rodadas 2B e 2C, sobre a mesma base.

## 1. O que muda na landing

A landing pública continua exatamente igual visualmente. A diferença é interna: hoje os textos vivem em `src/data/landing.ts` (hardcoded). A partir de agora, vivem no banco. A página passa a buscar os dados pelo slug (`botox-masculino`) e renderizar bloco a bloco, na ordem que o admin definir, pulando blocos desligados.

Em produção a página renderiza apenas a versão **publicada**. No admin você vê a versão **rascunho** com badge "Pré-visualização".

## 2. Filosofia do editor (o que ficou decidido)

- **Híbrido**: cada bloco tem 2 modos — Estruturado (campos prontos) ou HTML custom (sandbox). Nesta rodada construímos só o modo Estruturado; o slot HTML fica preparado na arquitetura mas habilitado na 2B.
- **Bloco-a-bloco com toggle on/off + drag-to-reorder**. Você não consegue quebrar layout — cada bloco se renderiza no design certo independente da ordem.
- **Toda página nasce duplicando uma "página-mãe"** (a Botox Masculino vira o template). Você nunca começa do zero. Implementação real do "duplicar" entra na 2B.

## 3. Estrutura de blocos (a espinha que vai escalar)

Os 11 blocos da landing atual viram tipos editáveis. Cada um com seus próprios campos:

| Bloco | Campos editáveis principais |
|---|---|
| `hero` | eyebrow, título (com itálico marcado), parágrafo, CTAs, imagem, caption |
| `authority_strip` | 4 selos (label + valor) |
| `manifesto_curto` | eyebrow, citação, autor, texto longo (side-sheet) |
| `metodo` | passos (título + descrição + detalhe expansível) |
| `casos` | quais casos exibir (do pool global) + ordem |
| `preco_ancora` | eyebrow, título, valor, bullets, texto do side-sheet |
| `depoimentos` | seleciona reviews do pool + ordem |
| `ai_opinions` | lista de citações de IAs |
| `equipe_rt` | foto, nome, CRBM, bio, acordeões |
| `cursos` | lista de cursos/mentorias |
| `faq` | perguntas (do pool) com toggle "destacada" |
| `cta_final` | título, parágrafo, 2 CTAs |
| `footer_compliance` | (global, não por página) |

Adicionar um bloco novo no futuro = nova entrada no enum + componente de render + componente de edição. A engine não muda.

## 4. Banco de dados

```text
pages
  id, slug (único), title, meta_title, meta_description,
  status ('draft'|'published'), published_at,
  created_at, updated_at

page_blocks
  id, page_id (fk pages), type (enum), position (int),
  enabled (bool), mode ('structured'|'html'),  -- 'html' fica para 2B
  data (jsonb)  -- campos do bloco estruturado
  html_content (text)  -- usado quando mode='html', null por enquanto

cases (pool global)
  id, slug, area, age, cover_url, gallery (jsonb),
  before_url, after_url, notes, dosage, duration, toxin,
  created_at

case_page_overrides (override por página: ordem, destaque, esconder)
  id, page_id, case_id, position, featured (bool), hidden (bool)

faqs (pool global)
  id, question, answer, tags (text[]), position

reviews (pool global)
  id, name, rating, date_label, text, position

ai_opinions
  id, ai_name, company, quote, position

courses
  id, title, audience, duration, description, position

site_settings (linha única)
  whatsapp, phone, address, cnpj, alvara, rt_name, rt_register, ...

user_roles  -- separado do profiles, conforme regra de segurança
  id, user_id (fk auth.users), role ('admin')
```

**RLS**: leitura pública de páginas/blocos onde `status='published'` (ou via override quando logado como admin). Escrita só para `has_role(auth.uid(), 'admin')`. Pools globais (cases, faqs, etc) leitura pública, escrita admin.

## 5. Sistema de Rascunho / Publicado

Por simplicidade nesta rodada: cada `page` tem um `status` e um snapshot publicado embutido. Modelo:

- Você edita → salva no `page_blocks` correntes (rascunho vivo).
- Clica **Publicar** → copiamos snapshot dos blocos para o campo `published_snapshot` (jsonb) na linha `pages` + setamos `published_at`.
- Site público lê do `published_snapshot`. Admin lê do estado vivo.
- Botão **Reverter para versão publicada** desfaz mudanças não publicadas.

Vantagem: simples, sem tabela de versões. Quando você quiser histórico de versões (rodada futura), adicionamos tabela `page_versions` sem quebrar nada.

## 6. Mídia (decisão híbrida que você pediu)

Todo campo de imagem aceita **dois inputs**:

- **Upload** → vai para Supabase Storage no bucket `media` (público), com otimização básica e biblioteca reutilizável.
- **Cole o link** → URL externa (Google Drive público, Imgur, etc). O sistema valida o formato. Para Drive, fazemos auto-conversão do link `/file/d/ID/view` para o formato `uc?id=ID` que serve a imagem direto.

Bandeira no admin mostra de onde veio cada imagem. Biblioteca central só guarda as que foram upload — links externos ficam só no bloco onde foram usados (não poluem a biblioteca).

Nesta rodada 2A construímos só upload simples por bloco + paste de URL. Biblioteca central com busca/galeria entra na 2C.

## 7. Auth

- Login só por email/senha (nada de social, sem cadastro público).
- Você cria seu usuário admin uma vez via Lovable Cloud Users.
- Primeira vez que você logar, rodamos seed que insere `('seu-uuid', 'admin')` em `user_roles`. Antes disso: tela "Sem permissão".
- Rota `/admin/*` protegida por guard que checa role. Sem role, redireciona para `/admin/login`.
- Rota `/admin/login` pública.

## 8. Telas do admin (enxutas, foco no essencial)

```text
/admin/login                  Login email+senha
/admin                        Dashboard simples: lista de páginas + status
/admin/paginas                Lista de páginas (busca, filtro status)
/admin/paginas/:slug          Editor da página ← coração do CRM
/admin/casos                  CRUD do pool de casos clínicos
/admin/faqs                   CRUD do pool de FAQs
/admin/depoimentos            CRUD do pool de reviews
/admin/ia-opinions            CRUD das citações de IAs
/admin/cursos                 CRUD dos cursos
/admin/configuracoes          site_settings (WhatsApp, RT, alvará, etc)
```

### Editor da página (a tela mais importante)

Layout em 3 colunas:

```text
┌──────────────┬──────────────────────────┬──────────────┐
│ Lista de     │ Preview ao vivo          │ Painel do    │
│ blocos       │ (iframe da landing       │ bloco        │
│ (drag,       │  com query ?preview=1)   │ selecionado  │
│ on/off,      │                          │ (campos)     │
│ +Adicionar)  │                          │              │
└──────────────┴──────────────────────────┴──────────────┘
```

- Esquerda: cada bloco vira um card com handle de arrastar, switch on/off, ícone do tipo, título resumido. Clicar seleciona.
- Centro: iframe da própria landing em modo preview, scrolla até o bloco selecionado e o destaca com outline dourado.
- Direita: formulário do bloco selecionado. Campos variam por tipo de bloco (definidos via configuração declarativa para facilitar adicionar tipos novos).
- Topo: nome da página, status badge, botões **Salvar rascunho** / **Publicar** / **Reverter** / **Ver no site**.

Mobile: as 3 colunas viram tabs (Blocos / Preview / Editar).

## 9. Como adicionar/remover blocos numa página (responde sua pergunta direta)

Exemplo: nova página "Bioestimulador 40+", você não quer Antes-e-Depois.

1. (rodada 2B) Clica **Duplicar** a partir de Botox Masculino → nasce com todos os 11 blocos.
2. No bloco "Casos", desliga o switch (ou no bloco "Antes-e-depois" quando ele existir como tipo separado).
3. O bloco fica no banco mas com `enabled=false` → o site não renderiza, e ele continua disponível caso você mude de ideia.
4. Pode arrastar a ordem livremente. Pode duplicar um mesmo tipo de bloco se quiser dois acordeões da RT, por exemplo.
5. Pode adicionar blocos extras de uma biblioteca (botão **+ Adicionar bloco** mostra os tipos disponíveis).

Resultado: liberdade total de composição, sem nunca tocar em código.

## 10. SEO e dados sensíveis

- Cada página tem `meta_title` / `meta_description` editáveis, refletidos no `<head>` via `react-helmet-async` (instalar).
- Schema.org `MedicalClinic` + `FAQPage` injetados a partir dos dados (entra completo na 2C, mas a estrutura JSON básica já fica nesta rodada).
- Compliance no rodapé (CNPJ, alvará, RT) vem de `site_settings`, edita uma vez, vale para tudo.

## 11. Stack técnico

- Lovable Cloud (Supabase): Postgres + Auth + Storage.
- Frontend: rotas novas em React Router, todas as telas admin com shadcn/ui (Form + Sonner + Dialog).
- Drag-to-reorder: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Forms: `react-hook-form` + `zod` (já no projeto via shadcn).
- Server state: TanStack Query (já instalado).
- `react-helmet-async` para meta tags.
- Renderização da landing: refator do `Index.tsx` para ler `pages.published_snapshot` por slug e mapear cada bloco do snapshot ao componente de render correspondente. A rota `/` aponta para slug fixo `botox-masculino`. Nas rodadas seguintes adicionamos `/p/:slug`.

## 12. O que entrega esta rodada (checklist)

1. Migration: cria todas as tabelas + RLS + enums + função `has_role`.
2. Seed: copia o conteúdo atual de `src/data/landing.ts` para o banco como página `botox-masculino` publicada.
3. Refator do `Index.tsx`: lê do banco, renderiza por blocos. Visualmente idêntico ao atual.
4. Tela de login + guard de admin + role admin no banco.
5. Lista de páginas no admin.
6. Editor da página com 3 colunas, drag-to-reorder, on/off, formulários por tipo de bloco.
7. CRUD do pool de casos, FAQs, reviews, IAs, cursos, configurações.
8. Sistema rascunho/publicar/reverter funcionando.
9. Upload de imagem (Storage) + paste de URL externa.

## 13. O que NÃO entra nesta rodada (fica para 2B/2C)

- Criar página nova / duplicar página
- Slot HTML custom em qualquer bloco
- IA bloco-a-bloco ("sugerir com IA")
- Biblioteca central de mídia com galeria
- Página `/p/:slug` para múltiplas landings
- Sitemap dinâmico, schema.org completo, página individual de caso
- Histórico de versões publicadas
- 2º colaborador com role separada (sua decisão: admin único)

## 14. Ordem de execução (transparência)

Vou na ordem: migrations → seed → guard de auth → refator do Index para ler do banco (validar que site continua igual) → telas de listagem → editor de página → CRUDs dos pools → configurações → publicar/reverter. Após cada bloco grande, paro e mostro funcionando.

Quando aprovar, começo pelas migrations e auth.
