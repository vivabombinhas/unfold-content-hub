---
name: Decisões arquiteturais do CRM/Admin
description: Filosofia do editor, modelo de dados, autenticação e ordem de construção do painel admin
type: feature
---
# Decisões do CRM/Admin (Rodada 2)

- **Editor**: híbrido — blocos prontos com campos estruturados + slot HTML cru por bloco (sandbox CSS). Slot HTML habilitado na 2B.
- **Geração de página nova**: esqueleto pronto (duplicar página-mãe) + botão "Sugerir com IA" opcional bloco-a-bloco (via Lovable AI Gateway). IA habilitada na 2C.
- **Casos clínicos**: pool global + override por página (escolhe quais aparecem, ordem, esconder).
- **URLs**: `/p/[slug]` para todas as páginas. Rota `/` aponta para `botox-masculino`.
- **Publicação**: rascunho/publicado com botão Publicar. Snapshot publicado armazenado em `pages.published_snapshot` (jsonb). Site público lê do snapshot, admin lê do estado vivo.
- **Auth**: email+senha apenas. Admin único (1-2 pessoas com mesma role). `user_roles` separado de `profiles`. `has_role()` security definer.
- **Mídia**: híbrido — upload no Storage (bucket `media`) com biblioteca central + opção de colar URL externa (Google Drive público auto-converte `/file/d/ID/view` → `uc?id=ID`). Biblioteca central com galeria fica para 2C.
- **Ordem de construção**: 2A (base + editar landing atual) → 2B (criar páginas novas + duplicar + slot HTML) → 2C (biblioteca mídia + IA + SEO completo).
- **Blocos**: hero, authority_strip, manifesto_curto, metodo, casos, preco_ancora, depoimentos, ai_opinions, equipe_rt, cursos, faq, cta_final, footer_compliance.
- **Editor UI**: 3 colunas (lista de blocos com drag/on-off · preview iframe ao vivo · painel do bloco selecionado). Mobile = tabs.