import type { ResumeData } from "./types";

export interface Pillars {
  perfil: number;
  experiencia: number;
  competencias: number;
  formacao: number;
  comportamental: number;
  ats: number;
}

export interface Similarities {
  cargo: number;
  senioridade: number;
  responsabilidades: number;
  experiencia: number;
  competencias: number;
  comportamental: number;
  ats: number;
}

export interface Gap {
  skill: string;
  impact: number;
}

export interface PremiumAnalysis {
  pillars: Pillars;
  adherence: number;
  interview: number;
  approval: number;
  similarities: Similarities;
  gaps: Gap[];
  simulator: { action: string; to: number }[];
}

export interface Correction {
  summary?: string;
  jobTitle?: string;
  experiences?: { id: string; description?: string }[];
  skills?: string[];
  atsKeywords?: string[];
  fitScore?: number;
  fitFeedback?: string;
  foundSkills?: string[];
  missingSkills?: string[];
  suggestions?: string[];
  issues?: string[];
  pillars?: Pillars;
  pillarDetails?: Partial<
    Record<
      keyof Pillars,
      { feedback: string; tips: string[] }
    >
  >;
  interviewProbability?: number;
  approvalProbability?: number;
  similarities?: Similarities;
  gaps?: Gap[];
  classification?: string;
  strengths?: string[];
  improvements?: string[];
  approvalPotential?: "ALTO" | "MÉDIO" | "BAIXO";
}

export interface DiffItem {
  field: string;
  before: string;
  after: string;
}

export function buildDiff(correction: Correction, data: ResumeData): DiffItem[] {
  const diffs: DiffItem[] = [];
  if (correction.summary && correction.summary !== data.summary) {
    diffs.push({ field: "Resumo profissional", before: data.summary, after: correction.summary });
  }
  if (correction.jobTitle && correction.jobTitle !== data.jobTitle) {
    diffs.push({ field: "Cargo desejado", before: data.jobTitle, after: correction.jobTitle });
  }
  for (const exp of correction.experiences ?? []) {
    const original = data.experiences.find((e) => e.id === exp.id);
    if (original && exp.description && exp.description !== original.description) {
      diffs.push({
        field: `Experiência: ${original.role || original.company || "item"}`,
        before: original.description,
        after: exp.description,
      });
    }
  }
  if (correction.skills && correction.skills.join("|") !== data.skills.join("|")) {
    diffs.push({
      field: "Habilidades (ordem/unificação)",
      before: data.skills.join(", "),
      after: correction.skills.join(", "),
    });
  }
  return diffs;
}

export function applyCorrection(correction: Correction, data: ResumeData): ResumeData {
  return {
    ...data,
    summary: correction.summary ?? data.summary,
    jobTitle: correction.jobTitle ?? data.jobTitle,
    experiences: data.experiences.map((exp) => {
      const fix = correction.experiences?.find((c) => c.id === exp.id);
      return fix?.description ? { ...exp, description: fix.description } : exp;
    }),
    skills: correction.skills && correction.skills.length > 0 ? correction.skills : data.skills,
  };
}

const COMMON_TYPOS: Record<string, string> = {
  nitoramento: "monitoramento",
  nitoramentos: "monitoramentos",
  desenvolvimendo: "desenvolvimento",
  desenvovimento: "desenvolvimento",
  experiencia: "experiência",
  experiencias: "experiências",
  responsabilidade: "responsabilidade",
  gestao: "gestão",
  organizaçao: "organização",
  comunicaçao: "comunicação",
  automotivo: "automotiva",
  tecnologico: "tecnológica",
  aprimoramendo: "aprimoramento",
  suport: "suporte",
};

export function localCorrect(data: ResumeData): Correction {
  const issues: string[] = [];
  const changedTypos: string[] = [];

  const applyTypos = (text: string): string => {
    let out = text;
    for (const [from, to] of Object.entries(COMMON_TYPOS)) {
      const re = new RegExp(`\\b${from}\\b`, "gi");
      if (re.test(out)) {
        changedTypos.push(`${from} → ${to}`);
        out = out.replace(re, (m) =>
          m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase()
            ? to[0].toUpperCase() + to.slice(1)
            : to
        );
      }
    }
    return out;
  };

  const fix = (text: string): { text: string; changed: boolean } => {
    let out = text;
    const before = out;
    out = out.replace(/[ \t]+/g, " ").trim();
    out = out.replace(/\s+([,.;:!?])/g, "$1");
    out = out.replace(/\.{2,}/g, ".");
    out = applyTypos(out);
    out = out.replace(/([.!?]\s+)([a-zà-ú])/g, (_, p: string, c: string) => p + c.toUpperCase());
    if (out.length > 0 && /[a-zà-ú]/.test(out[0])) {
      out = out[0].toUpperCase() + out.slice(1);
    }
    return { text: out, changed: out !== before };
  };

  const summaryFix = fix(data.summary);

  const experiences: { id: string; description?: string }[] = [];
  let expChanged = false;
  for (const e of data.experiences) {
    const f = fix(e.description);
    if (f.changed) expChanged = true;
    experiences.push({ id: e.id, description: f.text });
  }

  const skills = [...new Set(data.skills.map((s) => s.trim()).filter(Boolean))];
  const skillsChanged = skills.join("|") !== data.skills.join("|");

  if (summaryFix.changed) {
    issues.push("Resumo profissional normalizado: espaços duplicados, pontuação e capitalização corrigidas");
  }
  if (expChanged) {
    issues.push("Descrições de experiências normalizadas: espaços, pontuação e letras maiúsculas corrigidas");
  }
  if (skillsChanged) {
    issues.push("Habilidades duplicadas removidas e espaços limpos");
  }
  if (changedTypos.length > 0) {
    issues.push(
      `Erros de digitação corrigidos: ${changedTypos.slice(0, 4).join(", ")}`
    );
  }
  if (issues.length === 0) {
    issues.push("Nenhum problema de formatação encontrado no texto — revise o conteúdo manualmente");
  }

  return {
    summary: summaryFix.text,
    experiences,
    skills: skillsChanged ? skills : undefined,
    issues,
  };
}