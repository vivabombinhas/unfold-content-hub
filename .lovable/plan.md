## MVP: Documentos por Procedimento (CRM Estética Batel)

Este plano implementa a geração, edição e publicação de TCLE (Termo de Consentimento) e Diferenciais Técnicos via IA para cada procedimento.

### 1. Banco de Dados (Supabase)
*   **Nova Tabela `procedure_documents`**:
    *   `id` (UUID, PK)
    *   `page_id` (UUID, FK para `pages`)
    *   `document_type` (Enum: `tcle`, `technical_differential`)
    *   `title` (Texto)
    *   `slug` (Texto, único - ex: `diamantacao-labial`)
    *   `html_content` (Texto/HTML)
    *   `status` (Enum: `draft`, `reviewed`, `approved`, `published`)
    *   `source_context` (JSONB - logs do que foi usado pela IA)
    *   Timestamps: `created_at`, `updated_at`, `reviewed_at`, `approved_at`, `published_at`
*   **RLS**: Acesso total para administradores; leitura pública apenas para status `published`.

### 2. IA / Geração (Edge Function)
*   **Nova Function `generate-procedure-document`**:
    *   Recebe `page_id` e `document_type`.
    *   Coleta contexto: título da página, blocos de conteúdo, FAQs, logs de scraping e compliance.
    *   Usa prompts estruturados seguindo os modelos fixos (TCLE com 12 seções, Diferenciais com 10 seções).
    *   Gera HTML limpo e profissional sem promessas excessivas.

### 3. Interface Administrativa (Page Editor)
*   **Nova Aba "Documentos" no Editor de Página**:
    *   Botões "Gerar com IA" para cada tipo de documento.
    *   Lista de documentos existentes com status e datas.
    *   Editor de HTML integrado (usando um componente de área de texto ou editor rico simples).
    *   Controles de workflow: Marcar como Revisado, Aprovar, Publicar.
    *   Botão "Copiar Link" para documentos publicados.

### 4. Visualização Pública
*   **Nova Rota em `App.tsx`**:
    *   `/documentos/tcle/:slug`
    *   `/documentos/diferenciais/:slug`
*   **Componente `DocumentViewer.tsx`**:
    *   Renderiza o conteúdo HTML com estilo minimalista e institucional.
    *   Exibe rodapé com Responsável Técnica e data de revisão.
*   **SEO**: Tags meta específicas para documentos (canonical, noindex para rascunhos).

### 5. Integração na Landing Page
*   **Atualização de `PublicPage.tsx`**:
    *   Adição de seção de "Documentação Legal e Técnica" no rodapé ou após o FAQ.
    *   Links automáticos:
        *   TCLE (se publicado)
        *   Diferenciais Técnicos (se publicado)
        *   Links institucionais fixos (Alvará, CNPJ, Privacidade).

### Detalhes Técnicos
*   **Renderização**: Uso de `dangerouslySetInnerHTML` com sanitização básica no frontend para o conteúdo gerado pela IA.
*   **Navegação**: O `SlugRedirectHandler` pode precisar de ajuste ou as novas rotas devem vir antes dele.

### Plano de Teste (Procedimento: Diamantação Labial)
1.  Acessar o editor da página "Diamantação Labial".
2.  Gerar TCLE via IA.
3.  Revisar o texto, alterar o status para "Publicado".
4.  Validar se o link apareceu no rodapé da página pública.
5.  Acessar `/documentos/tcle/diamantacao-labial` e verificar a formatação.

---
**Nota**: Este é um MVP focado em conteúdo. Funcionalidades como assinatura digital e PDFs estão fora do escopo inicial.