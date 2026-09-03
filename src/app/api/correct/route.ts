import { NextResponse } from "next/server";
import type { ResumeData } from "@/lib/types";
import { localCorrect, type Correction } from "@/lib/corrections";
import { Agent, fetch as undiciFetch } from "undici";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a OpenAI.
const OPENAI_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

function buildPrompt(data: ResumeData): string {
  return `Você é um especialista em currículos, otimização ATS e análise de aderência a vagas. Compare o currículo abaixo com a descrição da vaga e aplique melhorias automaticamente, mantendo TODOS os fatos originais (não invente nada).

Calcule um ÍNDICE DE ADERÊNCIA (0-100%) a partir de 6 pilares, cada um avaliado de 0 a 100:
- perfil (peso 25%): cargo desejado, área de atuação, objetivos, nível.
- experiencia (peso 25%): histórico, tempo de experiência, evolução, responsabilidades.
- competencias (peso 20%): habilidades exigidas pela vaga vs encontradas vs ausentes.
- formacao (peso 10%): escolaridade, cursos, certificações.
- comportamental (peso 10%): liderança, comunicação, organização, proatividade, trabalho em equipe, resolução de problemas, adaptabilidade.
- ats (peso 10%): estrutura, organização, clareza, legibilidade, palavras relevantes, formatação.

Aplique as melhorias AUTOMATICAMENTE no conteúdo:
- summary: reescreva em 2-3 frases impactantes incorporando palavras-chave da vaga.
- jobTitle: ajuste para o título profissional mais adequado à vaga.
- experiences: reescreva cada description com verbos de ação e resultados mensuráveis (mantenha o id exato). Não altere role, company ou period.
- skills: reordene colocando as mais relevantes para a vaga primeiro e remova duplicadas; não invente habilidades.
- atsKeywords: 6 a 12 palavras-chave da vaga incorporadas naturalmente no texto.
- foundSkills: competências do currículo que correspondem à vaga.
- missingSkills: competências exigidas pela vaga ausentes no currículo.
- suggestions: 3 a 5 sugestões objetivas para aumentar a aderência.
- strengths: 2 a 4 pontos fortes do currículo para a vaga.
- improvements: 2 a 4 oportunidades de melhoria.
- approvalPotential: "ALTO", "MÉDIO" ou "BAIXO" conforme o potencial de aprovação.
- issues: 4 a 8 problemas REAIS encontrados e corrigidos, específicos (não invente).
- classification: texto da faixa — 0-39 "Baixa compatibilidade", 40-69 "Compatibilidade média", 70-89 "Alta compatibilidade", 90-100 "Excelente compatibilidade".
- interviewProbability: número 0-100 estimando a chance de conseguir uma entrevista para esta vaga.
- approvalProbability: número 0-100 estimando a chance de aprovação/contratação final.
- similarities: objeto com 7 similaridades 0-100:
  - cargo: quão próximo o cargo do currículo está do cargo da vaga.
  - senioridade: match de nível (Júnior/Pleno/Sênior/Especialista/Coordenador/Gerente).
  - responsabilidades: comparação entre o que a vaga pede e o que o candidato executou.
  - experiencia: tempo, complexidade, escopo e porte dos projetos.
  - competencias: competências exigidas vs presentes vs correlatas.
  - comportamental: liderança, comunicação, colaboração, organização, resolução de problemas.
  - ats: estrutura, organização, palavras-chave e legibilidade.
- gaps: lista de objetos {"skill": "competência exigida ausente", "impact": número negativo representando a queda de aderência} para as principais lacunas.
- pillarDetails: para CADA um dos 6 pilares, um objeto com "feedback" (1 a 2 frases avaliando o currículo naquele pilar para a vaga) e "tips" (1 a 2 dicas objetivas de melhoria para aquele pilar).

Responda APENAS com JSON válido, sem markdown, no formato:
{"summary":"...","jobTitle":"...","experiences":[{"id":"...","description":"..."}],"skills":["..."],"atsKeywords":["..."],"foundSkills":["..."],"missingSkills":["..."],"suggestions":["..."],"strengths":["..."],"improvements":["..."],"approvalPotential":"ALTO","issues":["..."],"pillars":{"perfil":90,"experiencia":85,"competencias":78,"formacao":90,"comportamental":82,"ats":95},"interviewProbability":88,"approvalProbability":74,"similarities":{"cargo":100,"senioridade":92,"responsabilidades":87,"experiencia":90,"competencias":84,"comportamental":81,"ats":95},"gaps":[{"skill":"SAP BTP","impact":-6},{"skill":"EWM","impact":-4},{"skill":"MM","impact":-3}],"pillarDetails":{"perfil":{"feedback":"...","tips":["...","..."]},"experiencia":{"feedback":"...","tips":["...","..."]},"competencias":{"feedback":"...","tips":["...","..."]},"formacao":{"feedback":"...","tips":["...","..."]},"comportamental":{"feedback":"...","tips":["...","..."]},"ats":{"feedback":"...","tips":["...","..."]}},"classification":"Alta compatibilidade"}

Dados:
${JSON.stringify({
  fullName: data.fullName,
  jobTitle: data.jobTitle,
  summary: data.summary,
  jobDescription: data.jobDescription,
  experiences: data.experiences.map((e) => ({
    id: e.id,
    role: e.role,
    company: e.company,
    period: e.period,
    description: e.description,
  })),
  education: data.education,
  skills: data.skills,
  certifications: data.certifications,
  languages: data.languages,
})}`;
}

const PILLAR_WEIGHTS = {
  perfil: 0.25,
  experiencia: 0.25,
  competencias: 0.2,
  formacao: 0.1,
  comportamental: 0.1,
  ats: 0.1,
} as const;

function classify(score: number): string {
  if (score >= 90) return "Excelente compatibilidade";
  if (score >= 70) return "Alta compatibilidade";
  if (score >= 40) return "Compatibilidade média";
  return "Baixa compatibilidade";
}

export async function POST(request: Request) {
  const data = (await request.json()) as ResumeData;

  const unchanged: Correction = {
    ...localCorrect(data),
  };

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ correction: unchanged, fallback: true });
  }

  try {
    const res = await undiciFetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
                "Você é um especialista em currículos. Responda sempre com JSON válido, sem markdown.",
            },
            { role: "user", content: buildPrompt(data) },
          ],
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
        dispatcher: OPENAI_AGENT,
      }
    );

    if (!res.ok) {
      const raw = await res.text();
      console.error("Erro OpenAI (correct):", res.status, raw);
      return NextResponse.json({ correction: unchanged, fallback: true });
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ correction: unchanged, fallback: true });
    }

    const parsed = JSON.parse(content) as Correction;
    if (parsed.pillars) {
      const p = parsed.pillars;
      const weighted =
        (Number(p.perfil) || 0) * PILLAR_WEIGHTS.perfil +
        (Number(p.experiencia) || 0) * PILLAR_WEIGHTS.experiencia +
        (Number(p.competencias) || 0) * PILLAR_WEIGHTS.competencias +
        (Number(p.formacao) || 0) * PILLAR_WEIGHTS.formacao +
        (Number(p.comportamental) || 0) * PILLAR_WEIGHTS.comportamental +
        (Number(p.ats) || 0) * PILLAR_WEIGHTS.ats;
      parsed.fitScore = Math.round(weighted);
      parsed.classification = classify(parsed.fitScore);
    }
    return NextResponse.json({ correction: parsed, fallback: false });
  } catch (error) {
    console.error("Erro ao corrigir currículo:", error);
    return NextResponse.json({ correction: unchanged, fallback: true });
  }
}