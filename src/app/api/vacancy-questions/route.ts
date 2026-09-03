import { NextResponse } from "next/server";
import { localQuestions, type VacancyQuestionGroup } from "@/lib/vacancy";
import { Agent, fetch as undiciFetch } from "undici";

const OPENAI_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

export async function POST(request: Request) {
  const { jobDescription, responsabilidades, requisitos } = await request
    .json()
    .catch(() => ({ jobDescription: "", responsabilidades: "", requisitos: "" }));

  const vaga = typeof jobDescription === "string" ? jobDescription.trim() : "";
  const resp = typeof responsabilidades === "string" ? responsabilidades.trim() : "";
  const req = typeof requisitos === "string" ? requisitos.trim() : "";

  if (!vaga && !resp && !req) {
    return NextResponse.json({ groups: localQuestions("") });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ groups: localQuestions(vaga || resp || req) });
  }

  const contextoVaga = [
    vaga ? `DESCRIÇÃO DA VAGA:\n${vaga}` : "",
    resp ? `RESPONSABILIDADES E ATRIBUIÇÕES:\n${resp}` : "",
    req ? `REQUISITOS E QUALIFICAÇÕES:\n${req}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = `Você é um recrutador sênior especialista em análise de compatibilidade candidato-vaga.

Com base nas informações da vaga abaixo, gere EXATAMENTE 20 perguntas de múltipla escolha para avaliar se o candidato é um bom fit para esta vaga.

Agrupe as perguntas nas 4 categorias abaixo, com EXATAMENTE 5 perguntas por categoria (total = 20):

1) "Sobre a vaga" — perguntas sobre expectativas, disponibilidade, alignment com o perfil
2) "Responsabilidades e atribuições" — perguntas sobre experiência com as atividades específicas listadas
3) "Requisitos e qualificações" — perguntas sobre formação, certificações, idiomas, tempo de experiência
4) "Conhecimentos e habilidades" — perguntas sobre ferramentas, softwares, competências técnicas mencionadas

Regras OBRIGATÓRIAS:
- Gere EXATAMENTE 5 perguntas por categoria (20 no total).
- Cada pergunta deve ser DIRETAMENTE baseada nas informações reais da vaga (não invente).
- Cada pergunta deve ter de 3 a 5 opções de resposta curtas e objetivas.
- As opções devem ser variadas: faixas de experiência ("Não tenho", "Básico", "Intermediário", "Avançado"), tempo ("Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "5+ anos"), ou confirmação ("Sim, com experiência", "Sim, mas sem experiência", "Não").
- Foque em traçar o GRAU de匹配 do candidato com a vaga.
- Não inclua explicações, apenas JSON.

Responda APENAS JSON válido, sem markdown:
{"groups":[{"category":"Sobre a vaga","questions":[{"question":"...","options":["...","...","..."]}]}, ...]}

${contextoVaga}`;

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
            content: "Você é um recrutador sênior. Responda sempre e apenas JSON válido, sem markdown. Gere exatamente 20 perguntas (5 por categoria).",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
      dispatcher: OPENAI_AGENT,
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty");
    const parsed = JSON.parse(content) as { groups?: VacancyQuestionGroup[] };
    const groups = Array.isArray(parsed.groups)
      ? parsed.groups
          .map((g) => ({
            category: String(g?.category ?? "").trim(),
            questions: Array.isArray(g?.questions)
              ? g.questions
                  .map((q) => ({
                    question: String(q?.question ?? "").trim(),
                    options: Array.isArray(q?.options)
                      ? q.options.map((o) => String(o).trim()).filter(Boolean)
                      : [],
                  }))
                  .filter((q) => q.question && q.options.length >= 2)
                  .slice(0, 6)
              : [],
          }))
          .filter((g) => g.category && g.questions.length)
          .slice(0, 4)
      : [];
    return NextResponse.json({ groups: groups.length ? groups : localQuestions(vaga || resp || req) });
  } catch {
    return NextResponse.json({ groups: localQuestions(vaga || resp || req) });
  }
}
