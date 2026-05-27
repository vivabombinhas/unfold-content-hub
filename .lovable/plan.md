Para garantir que você possa testar a criação de páginas do zero, sem interferência de dados anteriores, realizarei uma limpeza técnica no banco de dados.

### Ações de Limpeza:
1. **Excluir Páginas de Teste**: Removerei todas as páginas criadas recentemente (como `diamantacao-labial-teste`, `lazer-teste`, etc.), mantendo apenas a `Página Modelo`.
2. **Excluir Blocos de Conteúdo**: Limparei todos os blocos associados a essas páginas na tabela `page_blocks`.
3. **Limpar Histórico de Extração**: Excluirei os registros na tabela `scraping_logs`. Isso garante que o sistema não use "memória" de extrações anteriores via Firecrawl e realize uma nova análise se você fornecer a URL novamente.
4. **Preservar Configurações Base**: Manteremos a `Página Modelo` (slug: `modelo`), o Banco de Imagens (Unsplash) e as configurações globais da clínica, para que o sistema continue operacional.

### Detalhes Técnicos:
- As páginas afetadas serão: `diamantacao-labial-teste`, `lazer-teste`, `skinbooster-teste`, `harmonizacao-facial-teste`, `luz-pulsada-teste`.
- Após a exclusão, você poderá usar os mesmos nomes e slugs, e o sistema os tratará como entidades 100% novas.

Deseja que eu execute essa limpeza agora?