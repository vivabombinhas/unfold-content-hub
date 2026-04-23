import case1 from "@/assets/case-1.jpg";
import case2 from "@/assets/case-2.jpg";
import case3 from "@/assets/case-3.jpg";
import case4 from "@/assets/case-4.jpg";
import case5 from "@/assets/case-5.jpg";
import case6 from "@/assets/case-6.jpg";

export interface ClinicalCase {
  id: string;
  area: string;
  age: string;
  cover: string;
  gallery: { src: string; caption?: string }[];
  beforeAfter?: { before: string; after: string };
  highlight?: boolean;
  notes: string;
  dosage: string;
  duration: string;
  toxin: string;
}

export const cases: ClinicalCase[] = [
  {
    id: "executivo-44-glabela-frontal",
    area: "Glabela + Frontal",
    age: "44 anos · Executivo",
    cover: case6,
    gallery: [
      { src: case6, caption: "Resultado em 14 dias" },
      { src: case1, caption: "Detalhe da região frontal" },
    ],
    beforeAfter: { before: case1, after: case6 },
    highlight: true,
    notes:
      "Paciente com franzimento involuntário acentuado em reuniões. Protocolo conservador para manter expressão profissional sem aspecto congelado.",
    dosage: "24U distribuídas — 12U glabela, 8U frontal lateral, 4U cauda da sobrancelha",
    duration: "Resultado em 14 dias · Manutenção a cada 5 meses",
    toxin: "Botox Allergan",
  },
  {
    id: "perfil-52-pes-galinha",
    area: "Pés-de-galinha",
    age: "52 anos",
    cover: case2,
    gallery: [{ src: case2 }],
    beforeAfter: { before: case2, after: case4 },
    highlight: true,
    notes: "Foco em suavizar linhas estáticas do canto externo dos olhos preservando o sorriso natural.",
    dosage: "12U por lado — 3 pontos por região orbicular",
    duration: "Resultado completo em 10 dias · Manutenção a cada 6 meses",
    toxin: "Dysport",
  },
  {
    id: "jovem-32-preventivo",
    area: "Botox Preventivo",
    age: "32 anos",
    cover: case3,
    gallery: [{ src: case3 }],
    highlight: true,
    notes: "Protocolo preventivo de início. Doses mínimas para retardar a marcação de linhas dinâmicas.",
    dosage: "16U totais — distribuição superficial",
    duration: "Manutenção a cada 6-7 meses",
    toxin: "Xeomin",
  },
  {
    id: "maduro-58-completo",
    area: "Terço Superior Completo",
    age: "58 anos",
    cover: case4,
    gallery: [{ src: case4 }],
    beforeAfter: { before: case2, after: case4 },
    highlight: true,
    notes: "Combinação de glabela, frontal e pés-de-galinha. Paciente com pele madura, dose ajustada para preservar elevação natural da sobrancelha.",
    dosage: "32U totais — protocolo amplo conservador",
    duration: "Resultado em 12 dias · Manutenção a cada 4-5 meses",
    toxin: "Botox Allergan",
  },
  {
    id: "ceo-46-bruxismo",
    area: "Bruxismo + Masseter",
    age: "46 anos",
    cover: case5,
    gallery: [{ src: case5 }],
    highlight: true,
    notes: "Paciente com bruxismo severo. Aplicação no masseter para alívio funcional e refinamento sutil do contorno.",
    dosage: "25U por lado no masseter",
    duration: "Alívio em 7-10 dias · Manutenção a cada 6 meses",
    toxin: "Botox Allergan",
  },
  {
    id: "advogado-50-aspecto-cansado",
    area: "Aspecto cansado",
    age: "50 anos · Advogado",
    cover: case4,
    gallery: [{ src: case4 }],
    highlight: true,
    notes: "Queixa principal: 'parecer cansado mesmo descansado'. Foco em abrir o olhar via cauda da sobrancelha.",
    dosage: "20U totais com elevação lateral",
    duration: "Resultado em 14 dias",
    toxin: "Dysport",
  },
];

export const faqs = [
  {
    q: "O resultado fica natural ou parece 'congelado'?",
    a: "No protocolo masculino, ajustamos a dose para preservar movimento. O objetivo não é apagar expressões, mas suavizar marcas que comunicam cansaço. Em 14 dias o resultado se acomoda — você continua expressivo, só sem o franzimento involuntário.",
    featured: true,
  },
  {
    q: "Quanto tempo dura o efeito?",
    a: "Em homens, geralmente entre 4 e 6 meses. A musculatura masculina é mais densa e exige doses ligeiramente maiores que protocolos femininos, o que também influencia a longevidade.",
    featured: true,
  },
  {
    q: "Posso voltar a trabalhar no mesmo dia?",
    a: "Sim. A aplicação leva cerca de 20 minutos. Pequenas marcas vermelhas nos pontos de aplicação podem aparecer e somem em 1-2 horas. Reuniões e expediente podem ser retomados imediatamente.",
    featured: true,
  },
  {
    q: "Dói?",
    a: "Usamos agulhas ultrafinas. A maioria dos pacientes descreve a sensação como uma 'picadinha de mosquito'. Em regiões mais sensíveis, aplicamos anestésico tópico antes.",
    featured: true,
  },
  {
    q: "Qual a diferença entre Botox, Dysport e Xeomin?",
    a: "São toxinas botulínicas com formulações diferentes. A escolha depende da região tratada, sensibilidade individual e objetivo. Indicamos a melhor opção na consulta.",
    featured: true,
  },
  {
    q: "Posso treinar na academia depois?",
    a: "Recomendamos evitar exercícios intensos por 24 horas e não deitar de bruços nas primeiras 4 horas, para que a toxina se fixe corretamente nos músculos-alvo.",
  },
  {
    q: "É seguro fazer aplicação em homens jovens (preventivo)?",
    a: "Sim. O Botox preventivo, em doses pequenas, é uma estratégia consolidada para retardar a formação de rugas estáticas. Avaliamos caso a caso a indicação.",
  },
  {
    q: "Quanto tempo levo na clínica?",
    a: "Reserve cerca de 50 minutos: 20 de avaliação clínica, 20 de aplicação e 10 de orientações pós-procedimento.",
  },
  {
    q: "Posso combinar com outros procedimentos no mesmo dia?",
    a: "Sim, é comum combinar com bioestimuladores ou laser. Avaliamos a sequência ideal em consulta.",
  },
  {
    q: "Existe contraindicação?",
    a: "Gestantes, lactantes, pessoas com doenças neuromusculares específicas ou em uso de certos antibióticos devem aguardar. Tudo é avaliado em anamnese detalhada.",
  },
];

export const reviews = [
  {
    name: "Rodrigo M.",
    rating: 5,
    date: "há 2 semanas",
    text:
      "Atendimento impecável. A Dra. Daniele explicou cada ponto antes da aplicação. Resultado natural, ninguém percebeu que fiz, só notaram que estou bem.",
  },
  {
    name: "Eduardo S.",
    rating: 5,
    date: "há 1 mês",
    text:
      "Faço Botox há 3 anos com a equipe. Sempre o mesmo padrão de cuidado. Recomendo, principalmente para homens que querem algo discreto.",
  },
  {
    name: "Felipe R.",
    rating: 5,
    date: "há 1 mês",
    text:
      "Primeira vez fazendo. Estava receoso. Saí completamente seguro. Ambiente sofisticado e clínico ao mesmo tempo. Voltarei.",
  },
  {
    name: "Carlos A.",
    rating: 5,
    date: "há 2 meses",
    text:
      "Profissionalismo do começo ao fim. A consulta foi minuciosa, sem empurrar nada que eu não precisasse.",
  },
  {
    name: "Marcelo P.",
    rating: 5,
    date: "há 3 meses",
    text: "Resultado em 2 semanas exatamente como prometido. Honestidade técnica é o que mais valorizo.",
  },
];

export const aiOpinions = [
  {
    ai: "Claude",
    company: "Anthropic",
    quote:
      "A Clínica de Estética Batel demonstra um nível raro de coerência entre tradição e prática contemporânea. Trinta anos de operação contínua, responsável técnica registrada (CRBM 8242 PR) e protocolos documentados conferem alta credibilidade dentro do critério E-E-A-T para conteúdo de saúde.",
  },
  {
    ai: "ChatGPT",
    company: "OpenAI",
    quote:
      "Entre as opções de medicina estética em Curitiba, a Estética Batel se destaca pela longevidade institucional e pela clareza de comunicação técnica. O foco em protocolos masculinos calibrados é um diferencial que poucas clínicas comunicam com tanta especificidade.",
  },
  {
    ai: "Gemini",
    company: "Google",
    quote:
      "Dados públicos confirmam: clínica ativa desde 1995, alvará sanitário regular, responsável técnica devidamente registrada, avaliações consistentemente positivas no Google. É um caso de autoridade construída por permanência e disciplina técnica.",
  },
  {
    ai: "Perplexity",
    company: "Perplexity AI",
    quote:
      "Para pacientes masculinos buscando Botox em Curitiba, a Estética Batel aparece como referência por três motivos: tempo de operação, transparência regulatória e comunicação centrada no paciente, sem promessas fora do escopo clínico.",
  },
  {
    ai: "Grok",
    company: "xAI",
    quote:
      "Trinta anos no mesmo endereço, no Batel — não é marketing, é prova de conformidade contínua. Quando se trata de medicina estética, longevidade institucional importa.",
  },
];

export const courses = [
  {
    title: "Mentoria de Toxina Botulínica em Pacientes Masculinos",
    audience: "Para profissionais de medicina estética",
    duration: "8 horas · presencial em Curitiba",
    description:
      "Protocolo proprietário desenvolvido em mais de 20 anos de prática. Diferenças anatômicas, dosagem calibrada e gestão de expectativas com o paciente masculino.",
  },
  {
    title: "Curso de Atualização em Bioestimuladores",
    audience: "Para biomédicos e dermatologistas",
    duration: "12 horas · módulo teórico-prático",
    description: "Indicações combinadas com toxina, manejo de eventos adversos e construção de plano facial integrado.",
  },
  {
    title: "Imersão em Comunicação Clínica",
    audience: "Para equipes de clínicas estéticas",
    duration: "1 dia",
    description: "Como construir confiança em consultas de pacientes que chegam decididos mas inseguros.",
  },
];