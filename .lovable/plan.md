# Landing-mãe · Botox Masculino · Clínica Estética Batel

Uma página de venda que parece enxuta, mas carrega 10× mais conteúdo do que aparenta — indexado pelo Google, impecável no mobile, e editável por você sozinho via painel.

---

## 1. Princípio de UX: "Enxugar sem esconder"

Três camadas de profundidade, cada uma com um padrão visual diferente — para que repetir a mesma técnica em tudo não vire monotonia.


| Camada                          | Padrão de UX                                                                                           | Usado em                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Superfície** (sempre visível) | Texto curto, 1 imagem, 1 CTA                                                                           | Hero, promessa, preço-âncora, 6 casos destacados                              |
| **Expansão editorial**          | Inline expand suave (acordeão refinado, linha dourada, ícone +/−)                                      | FAQ, bullets do método, "o que está incluso"                                  |
| **Aprofundamento imersivo**     | Side-sheet deslizante da direita (desktop) / bottom-sheet (mobile), com header fixo e conteúdo rolável | Tabela de preço completa, ficha de caso clínico, manifesto longo, vídeo+texto |


**Por que variar:** FAQ merece leitura rápida no lugar; caso clínico merece foco total (fullscreen imersivo); preço precisa caber tabela longa sem tirar o leitor do contexto (side-sheet). O cérebro do leitor percebe como **três gestos diferentes**, não como "mais um acordeão".

**SEO preservado em 100%:** todo o conteúdo "dobrado" renderiza no HTML desde o primeiro load — só é escondido via CSS (`max-height`/`transform`). Google lê tudo. Nada é carregado depois do clique.

---

## 2. Estrutura da página (de cima para baixo)

1. **Breadcrumb + header sticky** (com medalha 30 Anos mini que aparece ao rolar — já está no seu CSS)
2. **Hero** — título editorial serif + itálico dourado, foto vertical 4:5, medalha flutuante, 2 CTAs (WhatsApp / Avaliação)
3. **Faixa de autoridade** — "30 anos · desde 1995 · Curitiba · Batel" + 4 selos discretos
4. **Manifesto curto** (3-4 linhas visíveis) → link "Ler manifesto completo" abre **side-sheet** com texto longo + vídeo opcional
5. **Promessa / Método em 3 passos** — cards horizontais, cada passo expande inline para detalhes
6. **Casos clínicos** — vitrine de 6 destaques + botão "Ver biblioteca completa" → abre side-sheet "Biblioteca" com busca, filtro por área, e lista rolável (escala de 6 a 30+ sem redesign). Cada card → abre **ficha fullscreen imersiva** com slider antes/depois, notas do Dr., dosagem, tempo
7. **Preço-âncora** — card único "A partir de R$ X · inclui Y, Z" + botão "Entender o preço" → abre side-sheet **com slot de HTML custom** (ver item 4 abaixo)
8. **Depoimentos** — carrossel editorial curto (3 visíveis, arrasta)
9. **FAQ** — 5 perguntas visíveis + botão "Ver todas" expande o restante inline (indexado desde o load)
10. **CTA final** — bloco verde escuro, medalha grande, 2 botões
11. **Rodapé** + **FAB WhatsApp desktop** + **bottom-bar mobile** (já definidos no seu CSS)

Blocos marcados como "emocionais no futuro" (manifesto longo, vídeo-carta, história da clínica) ficam prontos no código, mas com **toggle de visibilidade por página** no admin — você liga/desliga por landing sem mexer em código.

---

## 3. Mobile impecável (inegociável)

- Todo side-sheet vira **bottom-sheet** que sobe do rodapé com handle de arrastar
- Ficha de caso fullscreen em mobile ocupa 100% da tela, slider antes/depois com toque
- Bottom-bar fixa (medalha + CTA WhatsApp) sempre presente, com auto-hide ao rolar pra baixo (já no seu CSS)
- Tipografia responsiva via `clamp()` (já no seu CSS)
- Imagens em `loading="lazy"` + `srcset` para 1x/2x
- Zero carrossel automático; tudo por toque/swipe
- Teste obrigatório em 360px, 390px, 414px antes de entregar

---

## 4. Slot de HTML custom (a grande sacada pro seu fluxo)

Você disse: *"e se para cada página eu puder colar um HTML diferente na seção de preço?"* — **sim, totalmente possível e é a solução certa.**

Como vai funcionar no painel admin:

- Cada seção "aprofundável" (preço, método, manifesto, depoimentos) tem **dois modos**:
  - **Modo estruturado:** você preenche campos (título, bullets, valores) → o site renderiza com o design padrão
  - **Modo HTML custom:** você cola um bloco de HTML/CSS próprio (aquele que você fez no Claude) → o site renderiza exatamente aquilo dentro do side-sheet, com sandbox de estilo (o CSS que você colar não vaza pro resto do site)
- Suporte a **vídeo embedado** (YouTube/Vimeo), imagens, tabelas, botões — qualquer coisa que caiba em HTML
- Para PDFs: upload do PDF + viewer embutido no side-sheet (ou botão de download)

Resultado: numa landing você tem tabela de preço simples, noutra tem calculadora de depilação, noutra tem vídeo+texto. **Mesma engine, conteúdo radicalmente diferente por página.**

---

## 5. Autonomia — Lovable Cloud + painel admin `/admin`

**Banco de dados** (tabelas que você edita sozinho):

- `paginas` — slug, título, SEO, quais blocos exibir e em que ordem
- `casos_clinicos` — foto antes, foto depois, área, idade, dosagem, notas, destaque (sim/não)
- `faqs` — pergunta, resposta, tags, ordem
- `precos` — área, toxina, valor, observação, vinculado a página
- `depoimentos` — nome, texto, foto, vídeo opcional
- `blocos_custom` — página + seção + HTML cru (para o slot do item 4)
- `configuracoes` — CTAs globais, WhatsApp, telefones

**Painel `/admin**` (protegido por login):

- Lista de cada tabela com buscar/filtrar/ordenar
- Formulário de criação/edição com upload de imagens (otimização automática) e campo rich-text ou HTML cru
- Preview antes de publicar
- Por página: checkboxes "manifesto visível? vídeo visível? depoimentos visível?" — você escolhe o que vai ao ar para cada landing

**Segurança:** autenticação via Lovable Cloud, role `admin` em tabela separada (nunca no perfil), RLS ativado em tudo.

---

## 6. Estética — refinamentos sobre o seu CSS

Mantenho fielmente: paleta (preto #0A0A0A, verde #0A2620, dourado #C9A961, creme #F5EEE1), Cormorant Garamond + Montserrat, medalha 30 Anos, régua dourada, itálico dourado nos títulos, grão sutil de fundo.

Refinamentos propostos:

- **Transições entre seções:** alternar fundos (preto → verde escuro → creme → preto) criando ritmo cinematográfico
- **Micro-animação nos números:** "30 anos", "+X pacientes" contam ao entrar na viewport
- **Régua dourada animada** como divisor de seção (já tem `scaleX`, vou reaproveitar)
- **Hover nos cards de caso:** zoom sutil + revelação do nome da área em overlay dourado
- **Side-sheet:** ao abrir, fundo da página recebe blur leve + vinheta — sensação de "entrar numa pasta"

---

## 7. SEO & E-E-A-T

- Todo conteúdo renderizado em HTML no primeiro load (casos, FAQ, preços) — mesmo dentro de side-sheets
- Schema.org: `MedicalClinic`, `MedicalProcedure`, `FAQPage`, `Review` — gerados automaticamente dos dados do banco
- URLs limpas (`/m/botox/masculino`), meta por página editável no admin
- `sitemap.xml` gerado dinamicamente a partir das páginas do banco
- Cada caso clínico tem URL própria opcional (`/casos/[slug]`) caso você queira que rankeie individualmente no futuro

---

## 8. Ordem de entrega (o que fica pronto na primeira rodada)

**Rodada 1 — Fundação + landing Botox Masculino no ar:**

1. Design system (cores, fontes, componentes base no estilo do seu CSS)
2. Landing completa com dados placeholder realistas
3. Os 3 padrões de aprofundamento funcionando (inline, side-sheet, fullscreen)
4. Mobile impecável + FAB WhatsApp + bottom-bar
5. Lovable Cloud configurado, tabelas criadas, RLS ativa

**Rodada 2 (próximo prompt depois de aprovar a rodada 1):**
6. Painel `/admin` completo com login + CRUD de todas as tabelas
7. Slot de HTML custom nos side-sheets
8. Migração do conteúdo placeholder para dados reais seus
9. Schema.org + sitemap + SEO final

Assim você vê a landing viva primeiro, aprova a estética e a UX, e só depois entramos no painel.

AGORA eu so quero o visual da LP/site pagina mae ... NAO faz agora o sistema de alimentação eu prefiro AGORA fazer a pagina, ver, discutir, refinar e depois aprovar e DAI fazer o sistema de alimentação, banco de dados etc ... outra pessoa inclusive vai me ajudar se eu precisar aqui ... Pelo que entendi é isso a RODADA 1 correto ... Estamos aprovando UX UI essas "frescuras" para depois ir para essa gestao da pagina... Uma observação muito importante ... APESAR de FEIA a pagina modelo trazia coisas muito importantes, MAPA integrado ajuda o GBP, aqueles DOCs TLCE Contrato, Alvará etc ... importantíssimo nao abro mao nem que seja um link no roda pe ... A parte de Cursos e mentorias (para profissionais) aumenta muiito o EEAT é um estudo técnico e PODE aumentar a conversão pq quem chega la na parte final pode faltar 1 argumento de segurança para ele ... A parte da Profissional (eu achei horrivel em termos de usabilidade, quer dizer nem taaao horrivel) mas nao pode abrir mao de ter no mínimo uma fotinho pequena e algo sobre a Doutora RT e link para outras doutoras  e o negocio de esconder algo é muito importante pq ali eu consigo colocar como a Doutora pensa sobre o procedimento ... mas tem que ser inteligente ... A parte superior então do site é mais emocional, fotos AD, Card de cassos (dentro quero por fotos, nao posso ficar limitado ou NAO colocar) ... o site tem um erro grave ... FALA do CRBM como se fosse algo de autoridade eu nao acho ... Avaliações do gogole com tipo "plugin" que puxa do proprio goole (estrelinhas) fundamental e CABE uma sessão para isso e nao tem problema ele estar na dobra de autoridade e depois em uma sessão separada ... aquela sessaõ de diferença tecnica, numeros que orientam nossa atuação NAO precisa mesmo, isso é informação que cabe em algum lugar de repente num link se preciso no roda-pe (vai depender muito da competicao pelo procedimento) é algo que acrescentaria se depois e 2 meses o projeto parou de subir ... MAS olha caberia uma linha lá embaixo perto do mapa com botoes (quantos eu decidir em cada caso)  sobre isso que abre um PDF em OCR, não seria tão ruim assim, seria tipo: Nosso difetencial técnico ... Na parte da RT pode sim colocar acordeon como ta la para que eu defina quantos são e pq por cada pagina ... tipo pode ser que num procedimento eu queira 2 acordeons mas nunca muitos, ali é sobre especializações, criação de metódo (algo da RT) autoridade person ... TODO rodape tem alvará sanitário, CNPJ, RT (Dra. Daniele Florencio CRBM 8242 PR) endereço, CEP e coisas do tipo bem pequeno ... AQUELE anvisa ESQUECE nao tem nada a ver ... UMA ULTIMA coisa ... PRECISA achar uma forma de ter uma sessão: O que as IAs (talvez use difetenre) falam sobre nós ... Quero mostrar a opinião do claude, gemini, chatgpt, perplexity etc ... creio que caiba numa sessão com rolagem lateral ... Isso é para outras IAs saberem o que as IAs falam de nos sobre aquilo ... e agora voltamos ao prjeto ? 