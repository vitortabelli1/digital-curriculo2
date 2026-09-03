import { NextResponse } from "next/server";
import { localSummarize, type VacancyAnalysis } from "@/lib/vacancy";
import { Agent, fetch as undiciFetch } from "undici";

const OPENAI_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

export async function POST(request: Request) {
  const { jobDescription } = await request.json().catch(() => ({ jobDescription: "" }));
  const vaga = typeof jobDescription === "string" ? jobDescription.trim() : "";

  if (!vaga) {
    return NextResponse.json({ analysis: localSummarize("") });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ analysis: localSummarize(vaga) });
  }

  const prompt = `Você é um especialista em recrutamento. Analise a descrição da vaga abaixo e extraia FIELMENTE, sem inventar informações, os dados solicitados.

Regras:
- "cargo": o cargo exato que está sendo solicitado, usando as palavras da vaga (ex.: "Consultor SAP TM", "Gerente de Projetos").
- "nivel": o nível exigido. Use um destes: "Estágio", "Júnior", "Pleno", "Sênior", "Especialista", "Coordenador", "Gerente" ou "Diretor". Se não citado, deduza do contexto.
- "area": a área de atuação (ex.: Tecnologia, Logística, Marketing, Financeiro, RH, Comercial, Saúde, Educação, Jurídico, Vendas, Operações).
- "segmento": o segmento da empresa ou setor (ex.: Tecnologia, Varejo, Saúde, Indústria, Beleza, Educação, Financeiro, Construção, Agronegócio).
  - "perfilProcurado": 1 a 2 frases descrevendo exatamente o perfil que a empresa busca, com as palavras da vaga.
  - "responsabilidades": até 6 tópicos principais extraídos da vaga.
  - "competencias": até 8 competências mais valorizadas, cada uma com "stars" de 1 a 5 indicando a importância (5 = mais importante). Use termos reais da vaga.
  - "comportamentais": características comportamentais citadas (ex.: Liderança, Comunicação, Organização, Colaboração, Adaptabilidade, Proatividade, Análise crítica, Gestão de conflitos, Resolução de problemas).
  - "complexidade": nível de complexidade da vaga de 1 a 5.
  - "concorrencia": estime a concorrência como "Baixa", "Média" ou "Alta".
  - "sobre": 1 a 3 tópicos sobre a vaga/empresa (contexto, o que a empresa faz, propósito).
  - "responsabilidadesAtribuicoes": até 6 tópicos de responsabilidades e atribuições do cargo.
  - "requisitosQualificacoes": até 6 tópicos de requisitos e qualificações (formação, experiência, certificações, idiomas).
  - "conhecimentosHabilidades": até 6 tópicos de conhecimentos e habilidades técnicas exigidas.

  Responda APENAS um JSON válido, sem markdown, no formato:
  {"cargo":"...","nivel":"...","area":"...","segmento":"...","perfilProcurado":"...","responsabilidades":["..."],"competencias":[{"name":"...","stars":5}],"comportamentais":["..."],"complexidade":4,"concorrencia":"Média","sobre":["..."],"responsabilidadesAtribuicoes":["..."],"requisitosQualificacoes":["..."],"conhecimentosHabilidades":["..."]}

Vaga:
${vaga}`;

  try {
    const res = await undiciFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um analista de vagas. Responda sempre e apenas JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      dispatcher: OPENAI_AGENT,
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty");
    const parsed = JSON.parse(content) as Partial<VacancyAnalysis>;
    const fallback = localSummarize(vaga);
    const aiCompetencies = Array.isArray(parsed.competencias)
      ? parsed.competencias.map((c: any) => ({
          name: String(c?.name ?? "").trim(),
          stars: Math.min(5, Math.max(1, Number(c?.stars ?? 3))),
        })).filter((c) => c.name)
      : [];
    const knownCompetencies = new Map(aiCompetencies.map((c) => [c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), c]));
    fallback.competencias.forEach((c) => {
      const key = c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!knownCompetencies.has(key)) knownCompetencies.set(key, c);
    });
    const competencias = Array.from(knownCompetencies.values()).slice(0, 30);

    const analysis: VacancyAnalysis = {
      cargo: parsed.cargo || fallback.cargo,
      nivel: parsed.nivel || fallback.nivel,
      area: parsed.area || fallback.area,
      segmento: parsed.segmento || fallback.segmento,
      perfilProcurado: parsed.perfilProcurado || fallback.perfilProcurado,
      responsabilidades: Array.isArray(parsed.responsabilidades)
        ? parsed.responsabilidades
        : fallback.responsabilidades,
      competencias,
      comportamentais: Array.isArray(parsed.comportamentais)
        ? parsed.comportamentais
        : fallback.comportamentais,
      complexidade: Math.min(5, Math.max(1, Number(parsed.complexidade ?? fallback.complexidade))),
      concorrencia: (["Baixa", "Média", "Alta"].includes(parsed.concorrencia as string)
        ? parsed.concorrencia
        : fallback.concorrencia) as VacancyAnalysis["concorrencia"],
      sobre: Array.isArray(parsed.sobre) ? parsed.sobre : fallback.sobre,
      responsabilidadesAtribuicoes: Array.isArray(parsed.responsabilidadesAtribuicoes)
        ? parsed.responsabilidadesAtribuicoes
        : fallback.responsabilidadesAtribuicoes,
      requisitosQualificacoes: Array.isArray(parsed.requisitosQualificacoes)
        ? parsed.requisitosQualificacoes
        : fallback.requisitosQualificacoes,
      conhecimentosHabilidades: Array.isArray(parsed.conhecimentosHabilidades)
        ? parsed.conhecimentosHabilidades
        : fallback.conhecimentosHabilidades,
    };
    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json({ analysis: localSummarize(vaga) });
  }
}
