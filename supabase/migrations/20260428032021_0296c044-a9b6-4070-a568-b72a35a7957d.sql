
-- Helper: base URL para imagens públicas no bucket "media"
-- https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/<path>

-- =========== SITE SETTINGS ===========
INSERT INTO public.site_settings (id, address, whatsapp, phone, cep, cnpj, alvara, rt_name, rt_register, google_maps_url, data)
VALUES (
  1,
  'Rua Brigadeiro Franco, 2670 — Batel, Curitiba/PR',
  'https://wa.me/5541999999999',
  '+55 41 3000-0000',
  '80250-030',
  '00.000.000/0001-00',
  'Alvará Sanitário Vigente',
  'Dra. Daniele',
  'CRBM 8242 PR',
  'https://maps.google.com/?q=Rua+Brigadeiro+Franco+2670+Curitiba',
  '{}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  address = EXCLUDED.address,
  whatsapp = EXCLUDED.whatsapp,
  phone = EXCLUDED.phone,
  cep = EXCLUDED.cep,
  cnpj = EXCLUDED.cnpj,
  alvara = EXCLUDED.alvara,
  rt_name = EXCLUDED.rt_name,
  rt_register = EXCLUDED.rt_register,
  google_maps_url = EXCLUDED.google_maps_url,
  updated_at = now();

-- =========== CASES ===========
DELETE FROM public.cases;
INSERT INTO public.cases (slug, area, age, cover_url, gallery, before_url, after_url, notes, dosage, duration, toxin, highlight, position) VALUES
('executivo-44-glabela-frontal','Glabela + Frontal','44 anos · Executivo',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-6.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-6.jpg","caption":"Resultado em 14 dias"},{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-1.jpg","caption":"Detalhe da região frontal"}]'::jsonb,
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-1.jpg',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-6.jpg',
 'Paciente com franzimento involuntário acentuado em reuniões. Protocolo conservador para manter expressão profissional sem aspecto congelado.',
 '24U distribuídas — 12U glabela, 8U frontal lateral, 4U cauda da sobrancelha',
 'Resultado em 14 dias · Manutenção a cada 5 meses',
 'Botox Allergan', true, 1),
('perfil-52-pes-galinha','Pés-de-galinha','52 anos',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-2.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-2.jpg"}]'::jsonb,
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-2.jpg',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg',
 'Foco em suavizar linhas estáticas do canto externo dos olhos preservando o sorriso natural.',
 '12U por lado — 3 pontos por região orbicular',
 'Resultado completo em 10 dias · Manutenção a cada 6 meses',
 'Dysport', true, 2),
('jovem-32-preventivo','Botox Preventivo','32 anos',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-3.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-3.jpg"}]'::jsonb,
 NULL, NULL,
 'Protocolo preventivo de início. Doses mínimas para retardar a marcação de linhas dinâmicas.',
 '16U totais — distribuição superficial',
 'Manutenção a cada 6-7 meses',
 'Xeomin', true, 3),
('maduro-58-completo','Terço Superior Completo','58 anos',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg"}]'::jsonb,
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-2.jpg',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg',
 'Combinação de glabela, frontal e pés-de-galinha. Paciente com pele madura, dose ajustada para preservar elevação natural da sobrancelha.',
 '32U totais — protocolo amplo conservador',
 'Resultado em 12 dias · Manutenção a cada 4-5 meses',
 'Botox Allergan', true, 4),
('ceo-46-bruxismo','Bruxismo + Masseter','46 anos',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-5.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-5.jpg"}]'::jsonb,
 NULL, NULL,
 'Paciente com bruxismo severo. Aplicação no masseter para alívio funcional e refinamento sutil do contorno.',
 '25U por lado no masseter',
 'Alívio em 7-10 dias · Manutenção a cada 6 meses',
 'Botox Allergan', true, 5),
('advogado-50-aspecto-cansado','Aspecto cansado','50 anos · Advogado',
 'https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg',
 '[{"src":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/case-4.jpg"}]'::jsonb,
 NULL, NULL,
 'Queixa principal: ''parecer cansado mesmo descansado''. Foco em abrir o olhar via cauda da sobrancelha.',
 '20U totais com elevação lateral',
 'Resultado em 14 dias',
 'Dysport', true, 6);

-- =========== FAQS ===========
DELETE FROM public.faqs;
INSERT INTO public.faqs (question, answer, featured, position) VALUES
('O resultado fica natural ou parece ''congelado''?','No protocolo masculino, ajustamos a dose para preservar movimento. O objetivo não é apagar expressões, mas suavizar marcas que comunicam cansaço. Em 14 dias o resultado se acomoda — você continua expressivo, só sem o franzimento involuntário.', true, 1),
('Quanto tempo dura o efeito?','Em homens, geralmente entre 4 e 6 meses. A musculatura masculina é mais densa e exige doses ligeiramente maiores que protocolos femininos, o que também influencia a longevidade.', true, 2),
('Posso voltar a trabalhar no mesmo dia?','Sim. A aplicação leva cerca de 20 minutos. Pequenas marcas vermelhas nos pontos de aplicação podem aparecer e somem em 1-2 horas. Reuniões e expediente podem ser retomados imediatamente.', true, 3),
('Dói?','Usamos agulhas ultrafinas. A maioria dos pacientes descreve a sensação como uma ''picadinha de mosquito''. Em regiões mais sensíveis, aplicamos anestésico tópico antes.', true, 4),
('Qual a diferença entre Botox, Dysport e Xeomin?','São toxinas botulínicas com formulações diferentes. A escolha depende da região tratada, sensibilidade individual e objetivo. Indicamos a melhor opção na consulta.', true, 5),
('Posso treinar na academia depois?','Recomendamos evitar exercícios intensos por 24 horas e não deitar de bruços nas primeiras 4 horas, para que a toxina se fixe corretamente nos músculos-alvo.', false, 6),
('É seguro fazer aplicação em homens jovens (preventivo)?','Sim. O Botox preventivo, em doses pequenas, é uma estratégia consolidada para retardar a formação de rugas estáticas. Avaliamos caso a caso a indicação.', false, 7),
('Quanto tempo levo na clínica?','Reserve cerca de 50 minutos: 20 de avaliação clínica, 20 de aplicação e 10 de orientações pós-procedimento.', false, 8),
('Posso combinar com outros procedimentos no mesmo dia?','Sim, é comum combinar com bioestimuladores ou laser. Avaliamos a sequência ideal em consulta.', false, 9),
('Existe contraindicação?','Gestantes, lactantes, pessoas com doenças neuromusculares específicas ou em uso de certos antibióticos devem aguardar. Tudo é avaliado em anamnese detalhada.', false, 10);

-- =========== REVIEWS ===========
DELETE FROM public.reviews;
INSERT INTO public.reviews (name, rating, date_label, text, position) VALUES
('Rodrigo M.', 5, 'há 2 semanas','Atendimento impecável. A Dra. Daniele explicou cada ponto antes da aplicação. Resultado natural, ninguém percebeu que fiz, só notaram que estou bem.', 1),
('Eduardo S.', 5, 'há 1 mês','Faço Botox há 3 anos com a equipe. Sempre o mesmo padrão de cuidado. Recomendo, principalmente para homens que querem algo discreto.', 2),
('Felipe R.', 5, 'há 1 mês','Primeira vez fazendo. Estava receoso. Saí completamente seguro. Ambiente sofisticado e clínico ao mesmo tempo. Voltarei.', 3),
('Carlos A.', 5, 'há 2 meses','Profissionalismo do começo ao fim. A consulta foi minuciosa, sem empurrar nada que eu não precisasse.', 4),
('Marcelo P.', 5, 'há 3 meses','Resultado em 2 semanas exatamente como prometido. Honestidade técnica é o que mais valorizo.', 5);

-- =========== AI OPINIONS ===========
DELETE FROM public.ai_opinions;
INSERT INTO public.ai_opinions (ai_name, company, quote, position) VALUES
('Claude','Anthropic','A Clínica de Estética Batel demonstra um nível raro de coerência entre tradição e prática contemporânea. Trinta anos de operação contínua, responsável técnica registrada (CRBM 8242 PR) e protocolos documentados conferem alta credibilidade dentro do critério E-E-A-T para conteúdo de saúde.', 1),
('ChatGPT','OpenAI','Entre as opções de medicina estética em Curitiba, a Estética Batel se destaca pela longevidade institucional e pela clareza de comunicação técnica. O foco em protocolos masculinos calibrados é um diferencial que poucas clínicas comunicam com tanta especificidade.', 2),
('Gemini','Google','Dados públicos confirmam: clínica ativa desde 1995, alvará sanitário regular, responsável técnica devidamente registrada, avaliações consistentemente positivas no Google. É um caso de autoridade construída por permanência e disciplina técnica.', 3),
('Perplexity','Perplexity AI','Para pacientes masculinos buscando Botox em Curitiba, a Estética Batel aparece como referência por três motivos: tempo de operação, transparência regulatória e comunicação centrada no paciente, sem promessas fora do escopo clínico.', 4),
('Grok','xAI','Trinta anos no mesmo endereço, no Batel — não é marketing, é prova de conformidade contínua. Quando se trata de medicina estética, longevidade institucional importa.', 5);

-- =========== COURSES ===========
DELETE FROM public.courses;
INSERT INTO public.courses (title, audience, duration, description, position) VALUES
('Mentoria de Toxina Botulínica em Pacientes Masculinos','Para profissionais de medicina estética','8 horas · presencial em Curitiba','Protocolo proprietário desenvolvido em mais de 20 anos de prática. Diferenças anatômicas, dosagem calibrada e gestão de expectativas com o paciente masculino.', 1),
('Curso de Atualização em Bioestimuladores','Para biomédicos e dermatologistas','12 horas · módulo teórico-prático','Indicações combinadas com toxina, manejo de eventos adversos e construção de plano facial integrado.', 2),
('Imersão em Comunicação Clínica','Para equipes de clínicas estéticas','1 dia','Como construir confiança em consultas de pacientes que chegam decididos mas inseguros.', 3);

-- =========== PAGE: botox-masculino ===========
DELETE FROM public.pages WHERE slug = 'botox-masculino';

WITH new_page AS (
  INSERT INTO public.pages (slug, title, meta_title, meta_description, status, published_at)
  VALUES (
    'botox-masculino',
    'Botox Masculino em Curitiba',
    'Botox Masculino em Curitiba | Estética Batel — 30 anos',
    'Clínica de Estética Batel: protocolo masculino calibrado, RT registrada (CRBM 8242 PR), 30 anos no Batel. Resultado natural em 14 dias.',
    'published',
    now()
  )
  RETURNING id
)
INSERT INTO public.page_blocks (page_id, type, position, enabled, mode, data) 
SELECT id, t, p, true, 'structured', d FROM new_page,
(VALUES
  ('hero'::block_type, 1, '{"eyebrow":"Estética Batel · desde 1995","title":"Botox masculino, calibrado para você não parecer ''feito''.","subtitle":"30 anos de prática clínica no Batel. Protocolo conservador para executivos, profissionais e pais de família que querem suavizar marcas — sem perder a expressão.","cta_label":"Agendar avaliação","cta_href":"#contato","image_url":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/hero-male.jpg"}'::jsonb),
  ('authority_strip', 2, '{"items":[{"label":"30 anos no Batel"},{"label":"RT: Dra. Daniele · CRBM 8242 PR"},{"label":"Alvará Sanitário Vigente"},{"label":"+5.000 aplicações"}]}'::jsonb),
  ('manifesto_curto', 3, '{"title":"Por que homens escolhem a Batel","body":"Não tratamos Botox masculino como Botox feminino com dose maior. A musculatura é diferente, a expectativa é diferente, e a comunicação precisa ser direta. Em 30 anos, refinamos um protocolo que respeita seu rosto e sua rotina."}'::jsonb),
  ('metodo', 4, '{"title":"Como funciona","steps":[{"n":1,"title":"Avaliação","desc":"20 minutos analisando sua musculatura em movimento e em repouso."},{"n":2,"title":"Plano calibrado","desc":"Dose e pontos discutidos antes da aplicação. Você decide o nível de suavização."},{"n":3,"title":"Aplicação","desc":"20 minutos. Agulhas ultrafinas. Você sai e volta para o expediente."},{"n":4,"title":"Acompanhamento","desc":"Retorno em 14 dias para ajustes finos, se necessário."}]}'::jsonb),
  ('casos', 5, '{"title":"Casos clínicos reais","subtitle":"Pacientes da clínica · imagens autorizadas","limit":6}'::jsonb),
  ('preco_ancora', 6, '{"title":"Investimento","price_label":"a partir de R$ 1.200","note":"Valor da aplicação varia conforme número de regiões e marca da toxina. Discutido em consulta, sem surpresas."}'::jsonb),
  ('depoimentos', 7, '{"title":"O que dizem no Google","subtitle":"Avaliações reais de pacientes"}'::jsonb),
  ('ai_opinions', 8, '{"title":"O que as IAs dizem sobre a Batel","subtitle":"Análises independentes de modelos de linguagem"}'::jsonb),
  ('equipe_rt', 9, '{"title":"Responsável Técnica","name":"Dra. Daniele","register":"CRBM 8242 PR","bio":"Biomédica Esteta com mais de 20 anos dedicados à medicina estética. Especialista em protocolos masculinos calibrados.","photo_url":"https://ldsixdxmdzngagbminwh.supabase.co/storage/v1/object/public/media/landing/dra-rt.jpg"}'::jsonb),
  ('cursos', 10, '{"title":"Formação para profissionais","subtitle":"Mentorias e cursos ministrados pela equipe"}'::jsonb),
  ('faq', 11, '{"title":"Perguntas frequentes"}'::jsonb),
  ('cta_final', 12, '{"title":"Agende sua avaliação","subtitle":"Resposta em até 1 hora útil pelo WhatsApp.","cta_label":"Falar pelo WhatsApp","cta_href":"https://wa.me/5541999999999"}'::jsonb)
) AS blocks(t, p, d);

-- =========== PUBLISHED SNAPSHOT ===========
UPDATE public.pages SET published_snapshot = jsonb_build_object(
  'page', jsonb_build_object(
    'slug', slug, 'title', title, 'meta_title', meta_title, 'meta_description', meta_description
  ),
  'blocks', (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', b.id, 'page_id', b.page_id, 'type', b.type, 'position', b.position,
        'enabled', b.enabled, 'mode', b.mode, 'data', b.data, 'html_content', b.html_content
      ) ORDER BY b.position
    )
    FROM public.page_blocks b WHERE b.page_id = pages.id
  )
) WHERE slug = 'botox-masculino';
