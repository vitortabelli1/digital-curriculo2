import { NextResponse } from "next/server";
import type { ResumeData } from "@/lib/types";
import { Agent, fetch as undiciFetch } from "undici";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a OpenAI.
const OPENAI_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

function buildPrompt(data: ResumeData): string {
  return `Escreva uma carta de apresentação profissional em português (Brasil), formal e persuasiva, com no máximo 4 parágrafos.

Dados do candidato:
- Nome: ${data.fullName || "—"}
- Cargo desejado: ${data.jobTitle || "—"}
- Resumo: ${data.summary || "—"}
- Experiências: ${data.experiences
    .map((e) => `${e.role} em ${e.company} (${e.period}): ${e.description}`)
    .join(" | ") || "—"}
- Formação: ${data.education
    .map((e) => `${e.degree} - ${e.institution} (${e.year})`)
    .join(" | ") || "—"}
- Habilidades: ${data.skills.join(", ") || "—"}

A carta deve:
1. Ter assunto: "Carta de Apresentação - ${data.jobTitle || "Candidatura"}".
2. Começar com a saudação "Prezados(as) recrutadores(as),".
3. Destacar as experiências e habilidades mais relevantes para o cargo.
4. Terminar com despedida formal e o nome do candidato.
5. Não inventar informações que não estejam nos dados fornecidos.`;
}

function templateLetter(data: ResumeData): string {
  const lines = [
    `Assunto: Carta de Apresentação - ${data.jobTitle || "Candidatura"}`,
    "",
    "Prezados(as) recrutadores(as),",
    "",
    `Me chamo ${data.fullName || "..."} e tenho grande interesse na oportunidade de ${data.jobTitle || "..."}. ${data.summary || ""}`,
    data.experiences.length > 0
      ? `Minha experiência inclui ${data.experiences
          .map((e) => `${e.role} em ${e.company}${e.period ? ` (${e.period})` : ""}`)
          .join(", ")}.`
      : "",
    data.skills.length > 0
      ? `Entre minhas principais habilidades estão: ${data.skills.join(", ")}.`
      : "",
    "Fico à disposição para uma conversa e agradeço pela atenção.",
    "",
    "Atenciosamente,",
    data.fullName || "",
  ];
  return lines.join("\n");
}

export async function POST(request: Request) {
  const data = (await request.json()) as ResumeData;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      letter: templateLetter(data),
      fallback: true,
    });
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
                "Você é um especialista em currículos e cartas de apresentação. Escreva em português do Brasil, de forma profissional e sem exageros.",
            },
            { role: "user", content: buildPrompt(data) },
          ],
          temperature: 0.7,
        }),
        dispatcher: OPENAI_AGENT,
      }
    );

    if (!res.ok) {
      const raw = await res.text();
      console.error("Erro OpenAI:", res.status, raw);
      return NextResponse.json({ letter: templateLetter(data), fallback: true });
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const letter = json.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ letter, fallback: !letter });
  } catch (error) {
    console.error("Erro ao gerar carta:", error);
    return NextResponse.json({ letter: templateLetter(data), fallback: true });
  }
}