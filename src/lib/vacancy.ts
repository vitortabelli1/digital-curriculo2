function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const SENIORITY_WORDS = [
  "estagio", "estagiario", "trainee", "junior", "pleno", "senior",
  "especialista", "coordenador", "gerente", "supervisor", "lider", "diretor",
];
const ROLE_WORDS = [
  "analista", "consultor", "desenvolvedor", "engenheiro", "gestor", "coordenador",
  "gerente", "especialista", "auxiliar", "assistente", "supervisor", "lider",
  "diretor", "arquiteto", "designer", "vendedor", "venda", "suporte", "tecnico",
  "motorista", "enfermeiro", "professor", "advogado", "contador", "recepcionista",
  "atendente", "estagiario",
];
const AREA_WORDS = [
  "tecnologia", "logistica", "marketing", "financeiro", "rh", "recursos", "comercial",
  "saude", "educacao", "juridico", "vendas", "operacoes", "producao", "administrativo",
  "contabil",
];
const SEGMENT_WORDS = [
  "varejo", "saude", "industria", "beleza", "educacao", "tecnologia", "financeira",
  "banco", "seguro", "alimenticio", "construcao", "agronegocio",
];

const SKILLS_DICT = [
  "excel", "sap", "sap fi", "s4 hana", "sap drc", "power bi", "tableau", "sql", "python", "java", "javascript",
  "typescript", "react", "node", "c#", "php", "laravel", "word", "powerpoint",
  "ingles", "espanhol", "frances", "mandarim", "gestao", "lideranca", "liderança",
  "comunicacao", "comunicação", "negociacao", "negociação", "vendas", "marketing",
  "crm", "erp", "rh", "recrutamento", "selecao", "seleção", "treinamento", "financeiro",
  "contabil", "fiscal", "logistica", "logística", "supply", "compras", "projetos",
  "scrum", "agile", "agil", "metodologias", "design", "ux", "ui", "seo", "ads",
  "redes", "infraestrutura", "cloud", "aws", "azure", "google", "juridico", "jurídico",
  "advocacia", "pid", "lean", "six sigma", "qualidade", "atendimento", "suporte",
  "consultoria", "planejamento", "analytic", "analítico", "analitico", "relatorios",
  "relatórios", "apresentacao", "apresentação", "orçamento", "orçamento", "bid",
  "proposta", "campanha", "midia", "mídia", "branding", "ecommerce", "e-commerce",
  "nota fiscal", "faturamento eletrônico", "faturamento eletronico", "drc",
  "engenharia", "computação", "computacao", "contabilidade", "consultoria",
  "implementação", "implementacao", "ciclo", "processos", "plataformas", "integração", "integracao",
  "zabbix", "grafana", "prtg", "nagios", "monitoramento", "itil", "itsm",
  "service desk", "topdesk", "jira", "servicenow", "incidentes", "requisições",
  "eventos", "gerenciamento", "ferramentas", "help desk", "mesa de ajuda",
  "windows", "linux", "active directory", "firewall", "switch", "roteador",
  "vpn", "tcp/ip", "dns", "dhcp", "servidor", "virtualização", "vmware",
  "hyper-v", "docker", "kubernetes", "devops", "ci/cd", "git", "gitlab",
  "ansible", "puppet", "chef", "terraform", "monitor", "alerta", "logs",
  "snmp", "syslog", "api", "rest", "graphql", "mongodb", "mysql", "postgresql",
  "oracle", "redis", "elasticsearch", "kibana", "prometheus", "datadog",
];

function findWord(text: string, words: string[]): string | undefined {
  const t = stripAccents(text.toLowerCase());
  return words.find((w) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(stripAccents(w))}([^a-z0-9]|$)`, "i").test(t));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCompetencyNames(vaga: string, requisitos: string[]): string[] {
  const source = `${vaga}\n${requisitos.join("\n")}`;
  const names: string[] = [];
  const add = (value: string) => {
    const cleaned = value
      .replace(/^[\s:–—-]+|[\s.,;:–—-]+$/g, "")
      .replace(/^[-*•▪●\d.)]+\s*/, "")
      .trim();
    if (cleaned.length < 2 || cleaned.length > 100) return;
    if (/^(?:compet[eê]ncias?|habilidades?|requisitos?|conhecimentos?|qualifica[cç][oõ]es?|exigidas?)$/i.test(cleaned)) return;
    if (/^(?:nenhuma|n\/a|não informado)$/i.test(cleaned)) return;
    if (!names.some((item) => stripAccents(item).toLowerCase() === stripAccents(cleaned).toLowerCase())) names.push(cleaned);
  };

  const lines = source.split(/\r?\n/);
  let inSkillsSection = false;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const isHeading = /^(?:compet[eê]ncias?|habilidades?|requisitos?|conhecimentos?|qualifica[cç][oõ]es?|exigidas?)\s*:/i.test(trimmed);
    if (isHeading) {
      inSkillsSection = true;
      const content = trimmed.replace(/^(?:compet[eê]ncias?|habilidades?|requisitos?|conhecimentos?|qualifica[cç][oõ]es?|exigidas?)\s*:\s*/i, "");
      content.split(/[;,|\n]|\s+e\s+/i).forEach(add);
      return;
    }
    if (inSkillsSection && (/^[-*•▪●]/.test(trimmed) || /^(?:responsabilidades?|benef[ií]cios?|sobre a vaga|descri[cç][aã]o)\s*:/i.test(trimmed))) {
      if (/^(?:responsabilidades?|benef[ií]cios?|sobre a vaga|descri[cç][aã]o)\s*:/i.test(trimmed)) inSkillsSection = false;
      else trimmed.split(/[;,|]|\s+e\s+/i).forEach(add);
    }
  });

  const normalized = stripAccents(source.toLowerCase());
  SKILLS_DICT
    .filter((skill) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(stripAccents(skill))}([^a-z0-9]|$)`, "i").test(normalized))
    .forEach(add);

  return names;
}

export interface VacancyAnalysis {
  cargo: string;
  nivel: string;
  area: string;
  segmento: string;
  perfilProcurado: string;
  responsabilidades: string[];
  competencias: { name: string; stars: number }[];
  comportamentais: string[];
  complexidade: number;
  concorrencia: "Baixa" | "Média" | "Alta";
  sobre: string[];
  responsabilidadesAtribuicoes: string[];
  requisitosQualificacoes: string[];
  conhecimentosHabilidades: string[];
}

export function localSummarize(
  vaga: string,
  profile?: { cargo?: string; nivel?: string; area?: string },
  requisitos?: string[],
  tituloVaga?: string
): VacancyAnalysis {
  const tituloLower = stripAccents((tituloVaga || "").toLowerCase());
  const nivelFromTitle = SENIORITY_WORDS.find((w) => tituloLower.includes(w));
  const nivel = nivelFromTitle ?? findWord(vaga, SENIORITY_WORDS) ?? profile?.nivel ?? "Não identificado";
  const cargo = findWord(vaga, ROLE_WORDS) ?? profile?.cargo ?? "Cargo não identificado";
  const area = findWord(vaga, AREA_WORDS) ?? profile?.area ?? "Não identificada";
  const segmento = findWord(vaga, SEGMENT_WORDS) ?? "Não identificado";
  const responsabilidades = vaga
    .split(/\n|•|[-–]|;|\./)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
    .slice(0, 5);
  const vacLower = stripAccents(vaga.toLowerCase());
  
  const reqText = requisitos ? requisitos.join(" ").toLowerCase() : "";
  const reqLower = stripAccents(reqText);
  
  const reqCompetencies: string[] = [];
  const reqPatterns = [
    /(?:superior|graduação|graduacao|tecnólogo|tecnologo|mestrado|doutorado|pós|pos)\s+(?:completo|em)\s+(.+?)(?:;|$)/gi,
    /(?:experiência|experiencia)\s+de\s+\d+\s+anos?\s+com(?:o)?\s+(.+?)(?:;|$)/gi,
    /(?:conhecimento|conhecimentos)\s+(?:em|com)\s+(.+?)(?:;|$)/gi,
    /(?:formação|formacao)\s+com(?:o)?\s+(.+?)(?:;|$)/gi,
    /(?:necessár|necessar|desej|exig|qualific)(.+?)(?:;|$)/gi,
    /(?:familiaridade|familiarizado|domínio|dominio)\s+com\s+(.+?)(?:;|\(|$)/gi,
    /(?:ferramentas?|tools?)\s+(?:de|para)\s+(.+?)(?:;|\(|$)/gi,
    /(?:noções|nocoes|conhecimento)\s+(?:de|em)\s+(.+?)(?:;|\(|$)/gi,
  ];
  
  const searchText = vaga + " " + reqText;
  
  for (const pattern of reqPatterns) {
    let match;
    while ((match = pattern.exec(searchText)) !== null) {
      const text = match[1]?.trim();
      if (text && text.length > 3 && text.length < 150) {
        text.split(/[,;|]|\s+e\s+/i).map((item) => item.trim()).filter((item) => item.length > 3).forEach((item) => reqCompetencies.push(item));
      }
    }
  }
  
  const allCompetencies = [...new Set([...extractCompetencyNames(vaga, requisitos ?? []), ...reqCompetencies])];
  
  const competencias = allCompetencies
    .slice(0, 20)
    .map((name, i) => ({
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      stars: i < 3 ? 5 : i < 6 ? 4 : 3,
    }));
  const comportamentais = [
    "Liderança",
    "Comunicação",
    "Organização",
    "Colaboração",
    "Adaptabilidade",
    "Proatividade",
    "Análise crítica",
    "Gestão de conflitos",
    "Resolução de problemas",
  ].filter((c) => vaga.toLowerCase().includes(stripAccents(c.toLowerCase())));
  const complexidade =
    vaga.length > 800 ? 5 : vaga.length > 500 ? 4 : vaga.length > 300 ? 3 : vaga.length > 150 ? 2 : 1;
  const concorrencia = responsabilidades.length > 6 ? "Alta" : "Média";
  const perfilBase = [cargo, nivel, area].filter((x) => x && x !== "Não identificado").join(" ");

  const sentences = vaga
    .split(/[\n.;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
  const sobre: string[] = [];
  const resp: string[] = [];
  const req: string[] = [];
  const conc: string[] = [];
  for (const s of sentences) {
    const t = stripAccents(s.toLowerCase());
    if (/(respons|atribui|irá|será|sera|auxiliar|realizar|executar|atuar|cuidar|gerenci|coordena|elabor|desenvolv|analis|reporta|lider)/.test(t))
      resp.push(s);
    else if (/(requis|qualific|experi|ensino|forma|gradua|curso|necessár|necessar|desej|exig|idioma|escolar|cnhi|crea|oab|crm|coren)/.test(t))
      req.push(s);
    else if (/(conhec|habilid|domín|domin|saber|ferrament|pacote|office|sistema|tech|framework|software|sap|erp|crm)/.test(t))
      conc.push(s);
    else sobre.push(s);
  }
  return {
    cargo,
    nivel,
    area,
    segmento,
    perfilProcurado: perfilBase
      ? `Perfil procurado pela vaga: ${perfilBase}. ${competencias.length ? "Competências de destaque: " + competencias.slice(0, 3).map((c) => c.name).join(", ") + "." : ""}`
      : "Cole a descrição completa da vaga para identificar o perfil procurado com precisão.",
    responsabilidades,
    competencias,
    comportamentais,
    complexidade,
    concorrencia,
    sobre: sobre.length ? sobre.slice(0, 4) : sentences.slice(0, 2),
    responsabilidadesAtribuicoes: resp.length ? resp.slice(0, 6) : responsabilidades,
    requisitosQualificacoes: req.length ? req.slice(0, 6) : [],
    conhecimentosHabilidades: conc.length ? conc.slice(0, 6) : competencias.map((c) => c.name),
  };
}

export type VacancyQuestion = { question: string; options: string[] };

export type VacancyQuestionGroup = { category: string; questions: VacancyQuestion[] };

const VAGA_CATEGORIES = [
  "Sobre a vaga",
  "Responsabilidades e atribuições",
  "Requisitos e qualificações",
  "Conhecimentos e Habilidades",
];

export function localQuestions(vaga: string): VacancyQuestionGroup[] {
  const v = stripAccents(vaga.toLowerCase());
  const found = SKILLS_DICT.map((s) => stripAccents(s))
    .filter((s) => s.length > 3 && v.includes(s))
    .slice(0, 5)
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase()));

  const hasLideranca = /lider|coordena|gerenci|gestor|equipe/.test(v);
  const hasComunicacao = /comunic|reuni|apresent|cliente/.test(v);
  const hasAnalise = /analise|analis|dados|relatori|metrica/.test(v);
  const hasOrganizacao = /organiz|prazo|agenda|planej/.test(v);
  const hasProatividade = /proativ|iniciativ|autonom|independ/.test(v);

  const groups: VacancyQuestionGroup[] = [
    {
      category: VAGA_CATEGORIES[0],
      questions: [
        {
          question: "A vaga/empresa faz sentido para o seu momento profissional?",
          options: ["Sim, total", "Parcialmente", "Não"],
        },
        {
          question: "Qual seu nível de interesse nesta vaga?",
          options: ["Muito alto", "Alto", "Médio", "Baixo"],
        },
        {
          question: "Você está disponível para o regime de trabalho exigido?",
          options: ["Sim, totalmente", "Parcialmente", "Não"],
        },
        {
          question: "A localização/combina com sua situação?",
          options: ["Sim, presencial ok", "Prefiro remoto", "Híbrido ok", "Irrelevante"],
        },
        {
          question: "Qual sua expectativa salarial em relação à faixa da vaga?",
          options: ["Dentro da faixa", "Acima da faixa", "Abaixo da faixa", "A combinar"],
        },
      ],
    },
    {
      category: VAGA_CATEGORIES[1],
      questions: [
        {
          question: "Você já executou responsabilidades semelhantes às da vaga?",
          options: ["Sim, com experiência", "Sim, mas sem experiência formal", "Não"],
        },
        {
          question: "Qual sua experiência na área desta vaga?",
          options: ["Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "5 a 8 anos", "Mais de 8 anos"],
        },
        {
          question: "Você já trabalhou com atendimento/suporte a usuários?",
          options: ["Sim,经常", "Sim, às vezes", "Não"],
        },
        {
          question: "Já conduziu treinamentos ou reuniões com clientes internos?",
          options: ["Sim, frequentemente", "Sim, poucas vezes", "Não"],
        },
        {
          question: "Já participou de projetos de implementação ou melhoria de processos?",
          options: ["Sim, como líder", "Sim, como participante", "Não"],
        },
      ],
    },
    {
      category: VAGA_CATEGORIES[2],
      questions: [
        { question: "Você possui formação compatível com a vaga?", options: ["Sim", "Não"] },
        { question: "Possui certificações relacionadas à área da vaga?", options: ["Sim", "Não"] },
        {
          question: "Qual seu nível de inglês (se aplicável)?",
          options: ["Básico", "Intermediário", "Avançado", "Fluente", "Não se aplica"],
        },
        {
          question: "Possui experiência com normas e políticas de TI?",
          options: ["Sim, muita", "Sim, básica", "Não"],
        },
        {
          question: "Já trabalhou com sistemas ERP/SAP ou similares?",
          options: ["Sim, avançado", "Sim, básico", "Não"],
        },
      ],
    },
    {
      category: VAGA_CATEGORIES[3],
      questions: [
        {
          question: "Qual seu nível de conhecimento nos requisitos principais da vaga?",
          options: ["Básico", "Intermediário", "Avançado", "Especialista"],
        },
        ...(found.length
          ? found.map((s) => ({
              question: `Você possui experiência com ${s}?`,
              options: ["Sim, avançado", "Sim, básico", "Não"],
            }))
          : [
              {
                question: "Já utilizou ferramentas de produtividade (Office, Google Workspace)?",
                options: ["Sim, avançado", "Sim, básico", "Não"],
              },
            ]),
        {
          question: "Já liderou projetos ou equipes?",
          options: ["Sim, vários", "Sim, um ou dois", "Não"],
        },
      ],
    },
  ];
  return groups;
}

