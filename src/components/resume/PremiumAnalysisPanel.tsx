"use client";

import { useEffect, useRef, useState } from "react";
import { useResume } from "@/lib/resume-context";
import {
  applyCorrection,
  type Correction,
  type Gap,
  type Pillars,
  type PremiumAnalysis,
  type Similarities,
} from "@/lib/corrections";
import { ResumeForm } from "./ResumeForm";
import { TemplatePicker } from "./TemplatePicker";
import { ResumePreview } from "./ResumePreview";
import { generatePdfBlob, downloadBlob, sanitizeFilename } from "@/lib/pdf";
import { localSummarize, type VacancyAnalysis, type VacancyQuestionGroup } from "@/lib/vacancy";
import type { ResumeData } from "@/lib/types";

interface Profile {
  situacao: string;
  cargo: string;
  nivel: string;
  area: string;
  objetivo: string;
}

const STEPS: { key: keyof Pillars; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "experiencia", label: "Experiência" },
  { key: "competencias", label: "Competências" },
  { key: "formacao", label: "Formação" },
  { key: "comportamental", label: "Comport." },
  { key: "ats", label: "ATS" },
];

const DUAL_DIMS: { dim: string; keys: string[] }[] = [
  { dim: "Liderança", keys: ["lideranca", "liderar", "gestao"] },
  { dim: "Comunicação", keys: ["comunicacao", "comunicar"] },
  { dim: "Organização", keys: ["organizacao", "organizar"] },
  { dim: "Análise", keys: ["analise", "analitico", "analitica"] },
  { dim: "Resultados", keys: ["resultado", "metrica", "kpi", "performance"] },
  { dim: "Gestão", keys: ["gestao", "gerencia", "gerenciar"] },
];

const SITUACOES = [
  "Empregado e buscando recolocação",
  "Desempregado",
  "Mudança de carreira",
  "Primeiro emprego",
];
const NIVEIS = ["Júnior", "Pleno", "Sênior", "Especialista", "Coordenador", "Gerente", "Diretor"];
const OBJETIVOS = [
  "Conseguir entrevistas",
  "Crescimento profissional",
  "Migrar de área",
];

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STOPWORDS = new Set([
  "para", "com", "uma", "um", "uns", "umas", "dos", "das", "que", "por", "sem",
  "sua", "seu", "sao", "ser", "como", "mas", "ou", "se", "aos", "nas", "nos",
  "na", "no", "em", "de", "da", "do", "voce", "mais", "todo", "toda", "quando",
  "onde", "pelo", "pela", "pelos", "pelas", "este", "esta", "isto", "aquele",
  "aquela", "foi", "tem", "numa", "num", "porque", "sobre", "foi", "num",
]);

function tokens(text: string): string[] {
  return stripAccents(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

const SOFT_SKILLS = [
  "lideranca", "comunicacao", "proatividade", "organizacao", "equipe",
  "resolucao", "adaptabilidade", "trabalho", "foco", "negociacao",
  "criatividade", "colaboracao", "analitico", "analitica",
];

const SENIORITY_WORDS = [
  "estagio", "estagiario", "trainee", "junior", "pleno", "senior",
  "especialista", "coordenador", "gerente", "supervisor", "lider", "diretor",
];

function resumeTextOf(data: ResumeData): string {
  return stripAccents(
    [
      data.jobTitle,
      data.summary,
      ...data.experiences.map((e) => `${e.description} ${e.role} ${e.company}`),
      ...data.skills,
      ...data.education.map((e) => `${e.degree} ${e.institution}`),
      ...data.certifications,
      ...data.languages,
    ].join(" ")
  ).toLowerCase();
}

function buildSimulator(base: number, data: ResumeData, vaga: string): { action: string; to: number }[] {
  const out: { action: string; to: number }[] = [];
  if (data.experiences.length < 3)
    out.push({ action: "Adicionar experiência relacionada", to: clamp(base + 8) });
  if (data.summary.trim().length < 120)
    out.push({ action: "Melhorar resumo profissional", to: clamp(base + 6) });
  if (data.certifications.length === 0)
    out.push({ action: "Adicionar certificações", to: clamp(base + 5) });
  const vacSet = Array.from(new Set(tokens(vaga)));
  const resumeText = resumeTextOf(data);
  const missing = vacSet.filter((k) => !resumeText.includes(k)).length;
  if (missing > 0)
    out.push({ action: "Adicionar competências da vaga", to: clamp(base + Math.min(12, missing * 2)) });
  if (out.length === 0)
    out.push({ action: "Currículo já bem posicionado", to: clamp(base + 2) });
  return out;
}

function computeLiveAnalysis(data: ResumeData, vaga: string, profile?: Profile, extraText = ""): PremiumAnalysis {
  const resumeText = (resumeTextOf(data) + " " + extraText.toLowerCase()).trim();
  const vacSet = Array.from(new Set(tokens(vaga)));
  const matched = vacSet.filter((k) => resumeText.includes(k));
  const coverage = vacSet.length ? matched.length / vacSet.length : 0;
  const softRequired = SOFT_SKILLS.filter((w) => vacSet.includes(w));
  const softFound = softRequired.filter((w) => resumeText.includes(w)).length;

  const summaryLen = data.summary.trim().length;
  const profileText = `${data.jobTitle} ${profile?.cargo ?? ""} ${data.summary}`;
  const profileKeywords = vacSet.filter((k) => profileText.toLowerCase().includes(k));
  const profileCompleteness = (data.jobTitle.trim() || profile?.cargo.trim() ? 45 : 0) + (summaryLen >= 120 ? 35 : summaryLen >= 40 ? 20 : 0);
  let perfil = Math.min(100, Math.round(profileCompleteness * 0.55 + (vacSet.length ? (profileKeywords.length / vacSet.length) * 100 : 0) * 0.45));

  const n = data.experiences.length;
  const experienceCompleteness = n > 0
    ? Math.round((data.experiences.reduce((total, item) => total + [item.role, item.company, item.period, item.description].filter((value) => value.trim()).length, 0) / (n * 4)) * 100)
    : 0;
  const expText = stripAccents(data.experiences.map((e) => e.description).join(" ").toLowerCase());
  const experienceRelevance = vacSet.length ? Math.round((vacSet.filter((k) => expText.includes(k)).length / vacSet.length) * 100) : 0;
  let experiencia = Math.round(experienceCompleteness * 0.4 + experienceRelevance * 0.6);

  const skillMatches = data.skills.filter((skill) => vacSet.some((keyword) => stripAccents(skill.toLowerCase()).includes(keyword) || keyword.includes(stripAccents(skill.toLowerCase()))));
  let competencias = vacSet.length ? Math.round((skillMatches.length / vacSet.length) * 100) : 0;

  const educationText = data.education.map((item) => `${item.degree} ${item.institution}`).join(" ");
  const formationCompleteness = data.education.length
    ? Math.round((data.education.filter((item) => item.degree.trim() && item.institution.trim() && item.year.trim()).length / data.education.length) * 100)
    : 0;
  const formationRelevance = vacSet.length ? Math.round((vacSet.filter((keyword) => stripAccents(`${educationText} ${data.certifications.join(" ")}`.toLowerCase()).includes(keyword)).length / vacSet.length) * 100) : 0;
  let formacao = Math.round(formationCompleteness * 0.4 + formationRelevance * 0.6);

  let comportamental = softRequired.length ? Math.round((softFound / softRequired.length) * 100) : 50;

  let ats = 0;
  if (summaryLen > 0) ats += 20;
  if (n >= 1) ats += 20;
  if (data.skills.length >= 3) ats += 20;
  if (data.education.length) ats += 20;
  if (data.certifications.length) ats += 20;
  ats = Math.min(100, ats);

  // Respostas do questionário da IA — só somam quando a resposta é positiva
  if (extraText.trim().length > 0) {
    const t = extraText.toLowerCase();
    const pair = (q: string, ans: string) => t.includes(q) && t.includes(ans);
    const expYears =
      /mais de 8 anos/.test(t) ? 95 :
      /5 a 8 anos/.test(t) ? 85 :
      /3 a 5 anos/.test(t) ? 75 :
      /1 a 3 anos/.test(t) ? 60 :
      /menos de 1 ano/.test(t) ? 35 : 0;
    if (expYears) experiencia = Math.max(experiencia, expYears);
    if (pair("certific", "sim")) { formacao = Math.max(formacao, 90); ats = Math.min(100, ats + 15); }
    if (pair("formação compatível", "sim") || pair("formacao compativel", "sim")) formacao = Math.max(formacao, 75);
    if (pair("lider", "sim")) comportamental = Math.min(100, comportamental + 25);
    if (pair("experiência com", "sim") || pair("experiencia com", "sim")) competencias = Math.min(100, competencias + 12);
    ats = Math.min(100, ats + 10);
    perfil = Math.min(100, perfil + 10);
  }

  const pillars: Pillars = { perfil, experiencia, competencias, formacao, comportamental, ats };
  const adherence = clamp(
    perfil * 0.25 + experiencia * 0.25 + competencias * 0.2 + formacao * 0.1 + comportamental * 0.1 + ats * 0.1
  );

  const jobForCargo = profile?.cargo.trim() || data.jobTitle;
  const jobTokens = tokens(jobForCargo);
  const cargoOverlap = jobTokens.length
    ? jobTokens.filter((k) => vacSet.includes(k)).length / jobTokens.length
    : 0;
  const cargo = jobForCargo.trim() ? Math.max(35, Math.round(cargoOverlap * 100)) : 0;

  const detectLevel = (t: string) => SENIORITY_WORDS.find((w) => stripAccents(t.toLowerCase()).includes(w));
  const rLevel = detectLevel(jobForCargo) || (profile?.nivel ? detectLevel(profile.nivel) : undefined);
  const vLevel = detectLevel(vaga);
  let senioridade = 50;
  if (rLevel && vLevel) senioridade = rLevel === vLevel ? 100 : 72;
  else if (vLevel && !rLevel) senioridade = 35;
  else if (!vLevel && rLevel) senioridade = 60;

  const respOverlap = vacSet.length
    ? vacSet.filter((k) => (expText + " " + extraText).includes(k)).length / vacSet.length
    : 0;

  const similarities: Similarities = {
    cargo,
    senioridade,
    responsabilidades: Math.round(respOverlap * 100),
    experiencia: experiencia,
    competencias,
    comportamental,
    ats,
  };

  const obj = (profile?.objetivo ?? "").toLowerCase();
  let interview = adherence * 0.9 + (n > 0 ? 5 : 0) + (summaryLen > 40 ? 5 : 0);
  if (obj.includes("entrevista")) interview += 4;
  if (obj.includes("aprovacao")) interview += 4;
  if (obj.includes("salario")) interview += 2;
  interview = clamp(interview);

  let approval = adherence * 0.72 + pillars.ats * 0.1 + pillars.perfil * 0.1 + (data.certifications.length > 0 ? 4 : 0);
  if (obj.includes("aprovacao")) approval += 4;
  if (obj.includes("crescimento") || obj.includes("lideranca")) approval += 2;
  approval = clamp(approval);

  const gaps: Gap[] = vacSet
    .filter((k) => !resumeText.includes(k))
    .slice(0, 6)
    .map((k, i) => ({ skill: k, impact: -(i < 3 ? 3 : 2) }));

  const simulator = buildSimulator(adherence, data, vaga);

  return { pillars, adherence, interview, approval, similarities, gaps, simulator };
}

function computeEvolution(data: ResumeData, vaga: string, profile: Profile, finalAdherence: number, extraText = ""): number[] {
  const stage = (s: number): ResumeData => ({
    ...data,
    experiences: s >= 1 ? data.experiences : [],
    skills: s >= 2 ? data.skills : [],
    education: s >= 3 ? data.education : [],
    certifications: s >= 3 ? data.certifications : [],
    languages: s >= 3 ? data.languages : [],
  });
  const points = [0, 1, 2, 3, 4].map((s) => computeLiveAnalysis(stage(s), vaga, profile, extraText).adherence);
  points[4] = finalAdherence;
  return points;
}

function computeDual(data: ResumeData, vaga: string, extraText = ""): { dim: string; vaga: number; voce: number }[] {
  const v = stripAccents(vaga.toLowerCase());
  const r = (resumeTextOf(data) + " " + extraText.toLowerCase()).trim();
  const score = (text: string, keys: string[]) => {
    const found = keys.some((k) => text.includes(k));
    return found ? 76 + (text.length % 14) : 24 + (text.length % 10);
  };
  return DUAL_DIMS.map(({ dim, keys }) => ({
    dim,
    vaga: score(v, keys),
    voce: score(r, keys),
  }));
}

function summarizeVagaFallback(vaga: string, profile: Profile, requisitos?: string[], tituloVaga?: string): VacancyAnalysis {
  return localSummarize(vaga, { cargo: profile.cargo, nivel: profile.nivel, area: profile.area }, requisitos, tituloVaga);
}


function toAnalysis(result: Correction, data: ResumeData, vaga: string, profile: Profile): PremiumAnalysis {
  const pillars: Pillars =
    result.pillars ?? { perfil: 0, experiencia: 0, competencias: 0, formacao: 0, comportamental: 0, ats: 0 };
  const adherence = result.fitScore ?? 0;
  const similarities: Similarities =
    result.similarities ?? {
      cargo: pillars.perfil,
      senioridade: pillars.perfil,
      responsabilidades: pillars.experiencia,
      experiencia: pillars.experiencia,
      competencias: pillars.competencias,
      comportamental: pillars.comportamental,
      ats: pillars.ats,
    };
  const gaps = result.gaps ?? [];
  const simulator = buildSimulator(adherence, data, vaga);
  return { pillars, adherence, interview: result.interviewProbability ?? 0, approval: result.approvalProbability ?? 0, similarities, gaps, simulator };
}

function barColor(v: number): string {
  if (v >= 70) return "bg-emerald-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function probLabel(v: number): { text: string; dot: string } {
  if (v >= 85) return { text: "Muito Forte", dot: "bg-emerald-500" };
  if (v >= 70) return { text: "Forte", dot: "bg-emerald-500" };
  if (v >= 50) return { text: "Boa", dot: "bg-amber-500" };
  if (v >= 30) return { text: "Média", dot: "bg-amber-500" };
  return { text: "Baixa", dot: "bg-red-500" };
}

function AderenciaDonut({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <svg viewBox="0 0 100 100" className="h-32 w-32" role="img" aria-label={`Aderência ${value} por cento`}>
      <defs>
        <linearGradient id="adhGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="12" />
      <circle cx="50" cy="50" r={radius} fill="none" stroke="url(#adhGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 50 50)" />
      <text x="50" y="48" textAnchor="middle" className="fill-[#FF5A1F] text-[20px] font-extrabold dark:fill-[#FFC7A8]">{value}%</text>
      <text x="50" y="64" textAnchor="middle" className="fill-zinc-400 text-[8px] font-semibold uppercase tracking-wide">Aderência</text>
    </svg>
  );
}

function ProbBar({ label, value }: { label: string; value: number }) {
  const p = probLabel(value);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          <span className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
          {p.text}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-2xl font-extrabold text-[#FF5A1F] dark:text-[#FF9A6B]">{value}%</div>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(n)}
      <span className="text-zinc-300 dark:text-zinc-600">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

function VacancyStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#FFF0E6] bg-gradient-to-br from-[#FFF7F2] to-white p-3 dark:border-[#E84D13]/60 dark:from-[#111111]/40 dark:to-zinc-900">
      <div className="text-lg leading-none">{icon}</div>
      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-zinc-800 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function cap(s: string): string {
  const t = (s || "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function VacancySummaryCard({ v, loading }: { v: VacancyAnalysis; loading?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#FFE0CC] bg-white shadow-sm dark:border-[#E84D13] dark:bg-zinc-900">
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-4 py-3 text-white">
        <span className="text-base">🔎</span>
        <h4 className="text-sm font-bold uppercase tracking-wide">Resumo da Vaga</h4>
        {loading && <span className="ml-auto text-xs font-medium text-[#FFD5BE]">analisando…</span>}
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <VacancyStat icon="💼" label="Cargo" value={cap(v.cargo)} />
          <VacancyStat icon="🎯" label="Nível" value={cap(v.nivel)} />
          <VacancyStat icon="🏢" label="Área" value={cap(v.area)} />
          <VacancyStat icon="🌐" label="Segmento" value={cap(v.segmento)} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Complexidade <Stars n={v.complexidade} />
          </span>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-medium " +
              (v.concorrencia === "Alta"
                ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                : v.concorrencia === "Baixa"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300")
            }
          >
            Concorrência: {v.concorrencia}
          </span>
        </div>

        {v.competencias.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#FFF0E6] bg-gradient-to-br from-[#FFF7F2]/70 to-white p-4 dark:border-[#E84D13]/50 dark:from-[#111111]/30 dark:to-zinc-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#E84D13] dark:text-[#FFD5BE]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF5A1F] text-xs text-white">✦</span>
                  Competências identificadas
                </div>
                <p className="mt-1 text-xs text-zinc-500">Exigências técnicas e comportamentais encontradas na descrição.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#E84D13] shadow-sm dark:bg-zinc-900 dark:text-[#FFD5BE]">
                {v.competencias.length} {v.competencias.length === 1 ? "competência" : "competências"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {v.competencias.map((c) => (
                <span
                  key={c.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#FFF0E6] bg-white px-3 py-2.5 text-sm font-semibold text-[#FF5A1F] shadow-sm dark:border-[#E84D13]/60 dark:bg-zinc-900 dark:text-[#FFE9DC]"
                >
                  <span className="min-w-0 truncate">{c.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Stars n={c.stars} />
                    <span className="text-[10px] font-bold text-zinc-400">{c.stars}/5</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {v.competencias.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
            Nenhuma competência técnica foi identificada na descrição da vaga.
          </div>
        )}
      </div>
    </div>
  );
}


function classify(v: number): { label: string; cls: string } {
  if (v >= 85) return { label: "MUITO FORTE", cls: "text-emerald-600 dark:text-emerald-400" };
  if (v >= 70) return { label: "FORTE", cls: "text-emerald-600 dark:text-emerald-400" };
  if (v >= 50) return { label: "BOA", cls: "text-amber-600 dark:text-amber-400" };
  if (v >= 30) return { label: "MÉDIA", cls: "text-amber-600 dark:text-amber-400" };
  return { label: "BAIXA", cls: "text-red-600 dark:text-red-400" };
}

function ScoreBox({ value }: { value: number }) {
  const c = classify(value);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#FFC7A8]/50 bg-gradient-to-br from-[#FF5A1F] via-[#FF7A45] to-[#FF7A45] p-6 text-center text-white shadow-lg shadow-[0_10px_30px_rgba(255,90,31,.3)]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#FFD5BE]">Score Geral de Match</div>
        <div className="mt-2 flex items-end justify-center gap-1">
          <span className="text-6xl font-black leading-none">{value}</span>
          <span className="mb-1.5 text-2xl font-bold text-[#FFD5BE]">%</span>
        </div>
        <div className="mx-auto mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-400" style={{ width: `${value}%` }} />
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Força: {c.label}
        </div>
      </div>
    </div>
  );
}

function Thermometer({ label, value }: { label: string; value: number }) {
  const p = probLabel(value);
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
          <span className={`h-2 w-2 rounded-full ${p.dot}`} /> {p.text}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="text-3xl font-extrabold leading-none text-[#FF5A1F] dark:text-[#FF9A6B]">{value}%</div>
        <div className="mb-1 h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );
}

function GapPanel({ adherence }: { adherence: number }) {
  const gap = 100 - adherence;
  const Row = ({ label, val, color }: { label: string; val: number; color: string }) => (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className={`font-bold ${color}`}>{val}%</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${val}%` }} />
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full bg-[#FF5A1F]" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">Aderência vs Gap</h3>
      </div>
      <div className="space-y-3">
        <Row label="O que a vaga procura" val={100} color="text-[#FF5A1F] dark:text-[#FF9A6B]" />
        <Row label="O que você possui" val={adherence} color="text-emerald-600 dark:text-emerald-400" />
        <Row label="Gap identificado" val={gap} color="text-red-500 dark:text-red-400" />
      </div>
    </div>
  );
}

function RadarChart({ axes, series }: { axes: string[]; series: { name: string; values: number[]; color: string }[] }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 36;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, val: number): [number, number] => {
    const rr = (Math.max(0, Math.min(100, val)) / 100) * r;
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))];
  };
  const rings = [25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-64 w-full" role="img" aria-label="Radar de competências">
      {rings.map((rv) => (
        <polygon key={rv} points={axes.map((_, i) => pt(i, rv).join(",")).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {axes.map((label, i) => {
        const [x, y] = pt(i, 100);
        const lx = cx + (r + 20) * Math.cos(angle(i));
        const ly = cy + (r + 20) * Math.sin(angle(i));
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-500" style={{ fontSize: 9 }}>{label}</text>
          </g>
        );
      })}
      {series.map((s, si) => (
        <polygon key={si} points={s.values.map((v, i) => pt(i, v).join(",")).join(" ")} fill={s.color} fillOpacity={0.18} stroke={s.color} strokeWidth={2} />
      ))}
      {series.map((s, si) => s.values.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={`${si}-${i}`} cx={x} cy={y} r={2.5} fill={s.color} />;
      }))}
    </svg>
  );
}

function CategoryBars({ items }: { items: { label: string; candidate: number; required: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.label}>
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span>{c.label}</span>
            <span className="font-bold text-[#FF5A1F] dark:text-[#FF9A6B]">{c.candidate}%</span>
          </div>
          <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FFF7F2]0" style={{ width: `${c.candidate}%` }} />
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-400">Exigência da vaga: {c.required}%</div>
        </div>
      ))}
    </div>
  );
}

function MatchDetail({
  vacancyLabel,
  vacancyItems,
  userLabel,
  userItems,
}: {
  vacancyLabel: string;
  vacancyItems: string[];
  userLabel: string;
  userItems: string[];
}) {
  const normalizedUserItems = userItems.map((item) => stripAccents(item.toLowerCase()));
  const isPresent = (item: string) => normalizedUserItems.some((userItem) => userItem.includes(stripAccents(item.toLowerCase())) || stripAccents(item.toLowerCase()).includes(userItem));
  const list = (items: string[], type: "vacancy" | "user") => (
    <div className={type === "vacancy" ? "rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20" : "rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20"}>
      <div className={type === "vacancy" ? "flex items-center justify-between text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300" : "flex items-center justify-between text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300"}>
        <span>{type === "vacancy" ? vacancyLabel : userLabel}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] dark:bg-zinc-900">{items.length}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {items.map((item) => {
          const matched = type === "vacancy" && isPresent(item);
          return <div key={item} className="flex items-start gap-2 rounded-lg bg-white/80 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200">
            <span className={type === "vacancy" ? (matched ? "text-emerald-500" : "text-amber-500") : "text-emerald-500"}>{type === "vacancy" ? (matched ? "✓" : "!") : "✓"}</span>
            <span className="min-w-0 flex-1">{item}</span>
            {type === "vacancy" && <span className={`shrink-0 text-[10px] font-bold ${matched ? "text-emerald-600" : "text-amber-600"}`}>{matched ? "alinhado" : "faltante"}</span>}
          </div>;
        })}
        {items.length === 0 && <div className="text-xs text-zinc-500">Não informado.</div>}
      </div>
    </div>
  );
  return <div className="mt-4 grid gap-3 md:grid-cols-2">{list(vacancyItems, "vacancy")}{list(userItems, "user")}</div>;
}

function CompatibilityPie({ items }: { items: { label: string; pct: number }[] }) {
  const colors = ["#0f172a", "#2563eb", "#10b981", "#f59e0b", "#38bdf8", "#64748b"];
  const total = items.reduce((sum, item) => sum + Math.max(0, item.pct), 0) || 1;
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor += (Math.max(0, item.pct) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  }).join(", ");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Distribuição da compatibilidade</h4>
          <p className="mt-1 text-xs text-zinc-500">Peso relativo de cada dimensão analisada.</p>
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">Gráfico de análise</span>
      </div>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[150px_1fr]">
        <div className="relative mx-auto h-36 w-36 rounded-full" style={{ background: `conic-gradient(${stops})` }} aria-label="Gráfico de pizza da compatibilidade" role="img">
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-zinc-900">
            <span className="text-2xl font-black text-zinc-900 dark:text-white">{Math.round(items.reduce((sum, item) => sum + item.pct, 0) / items.length)}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">média</span>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <strong className="text-zinc-900 dark:text-zinc-100">{item.pct}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TinderMatch({
  data,
  vaga,
  profile,
  vacancySummary,
  vacancyAnswers,
  allQuestions,
}: {
  data: ResumeData;
  vaga: string;
  profile: Profile;
  vacancySummary?: VacancyAnalysis;
  vacancyAnswers?: Record<number, string>;
  allQuestions?: { question: string; options: string[] }[];
}) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const vacancyExperience = vacancySummary?.requisitosQualificacoes.filter((item) => /experi[eê]ncia|anos?|viv[eê]ncia|atua[cç][aã]o/i.test(item)) ?? [];
  const vacancyEducation = vacancySummary?.requisitosQualificacoes.filter((item) => /forma[cç][aã]o|gradua[cç][aã]o|curso|ensino|t[eé]cnico|superior|mba|p[oó]s|certifica/i.test(item)) ?? [];
  const vacancyEducationText = vacancyEducation.join(" ");
  const educationText = data.education.map((item) => `${item.degree} ${item.institution}`).join(" ");
  const certificationText = data.certifications.join(" ");
  const educationKeywords = Array.from(new Set(tokens(vacancyEducationText)));
  const vacancyKeywords = Array.from(new Set(tokens(vaga)));
  const keywordCoverage = (text: string, keywords: string[]) => {
    if (!text.trim() || keywords.length === 0) return 0;
    const normalizedText = stripAccents(text.toLowerCase());
    return Math.round((keywords.filter((keyword) => normalizedText.includes(stripAccents(keyword))).length / keywords.length) * 100);
  };
  const educationCompleteness = data.education.length > 0
    ? Math.round((data.education.filter((item) => item.degree.trim() && item.institution.trim() && item.year.trim()).length / data.education.length) * 100)
    : 0;
  const educationRelevance = keywordCoverage(educationText, vacancyEducation.length > 0 ? educationKeywords : vacancyKeywords);
  const certificationRelevance = data.certifications.length > 0 ? keywordCoverage(certificationText, vacancyKeywords) : 0;
  const academicScore = data.education.length > 0
    ? Math.round(educationCompleteness * 0.45 + educationRelevance * 0.55)
    : 0;
  const certificationScore = data.certifications.length > 0 ? certificationRelevance : 0;
  const formationRelevance = vacancyEducation.length > 0 ? Math.round((educationRelevance + certificationRelevance) / 2) : educationCompleteness;
  const requiredSkillValues = vacancySummary?.competencias.length
    ? vacancySummary.competencias.map((c) => (typeof c === "string" ? c : c.name))
    : vacancySummary?.conhecimentosHabilidades ?? [];
  const requiredSkills = Array.from(new Map(requiredSkillValues.map((skill) => [stripAccents(skill.toLowerCase()), skill])).values());
  const vacTokens = Array.from(new Set(tokens(vaga.toLowerCase())));
  const adherentSkills = data.skills.filter((s) => {
    const sl = stripAccents(s.toLowerCase());
    return sl.length > 1 && vacTokens.some((t) => stripAccents(t).includes(sl) || sl.includes(stripAccents(t)));
  });

  // Alinhamento casa-a-casa: verifica se uma skill da vaga está coberta por
  // alguma habilidade/ferramenta adicionada pelo usuário no currículo.
  const isSkillAligned = (skill: string) => {
    const b = stripAccents(skill.toLowerCase());
    if (b.length < 2) return false;
    return data.skills.some((s) => {
      const a = stripAccents(s.toLowerCase());
      return a === b || a.includes(b) || b.includes(a);
    });
  };

  if (!vacancySummary || !vaga) {
    return (
      <div className="mt-5 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#FFE0CC] bg-[#FFF7F2]/40 p-10 text-center dark:border-[#E84D13]/60 dark:bg-[#111111]/20">
        <div className="text-5xl">📋</div>
        <p className="mt-3 max-w-sm text-sm font-medium text-zinc-600 dark:text-zinc-300">Preencha os dados e analise a vaga para ver o resultado do match.</p>
      </div>
    );
  }

  const validateExperience = (exp: { role: string; description: string; company?: string }) => {
    const desc = (exp.description || "").trim();
    const role = (exp.role || "").trim();
    let score = 0;
    if (desc.length >= 100) score += 30;
    else if (desc.length >= 50) score += 15;
    if (role.length >= 3) score += 20;
    if (exp.company && exp.company.trim().length >= 2) score += 15;
    if (/[0-9]/.test(desc)) score += 10;
    if (/[.,]/.test(desc) && desc.split(/[.,]/).length >= 3) score += 10;
    const descWords = desc.split(/\s+/).length;
    if (descWords >= 20) score += 15;
    return Math.min(100, score);
  };

  const validateEducation = (edu: { degree: string; institution: string }) => {
    let score = 0;
    if (edu.degree && edu.degree.trim().length >= 5) score += 35;
    if (edu.institution && edu.institution.trim().length >= 5) score += 35;
    if (edu.degree && /degree|tecnolog|graduação|mestrado|doutorado|pós|mba/i.test(edu.degree)) score += 30;
    return Math.min(100, score);
  };

  const expScores = data.experiences.map(validateExperience);
  const avgExpScore = expScores.length > 0 ? Math.round(expScores.reduce((a, b) => a + b, 0) / expScores.length) : 0;

  const eduScores = data.education.map(validateEducation);
  const avgEduScore = eduScores.length > 0 ? Math.round(eduScores.reduce((a, b) => a + b, 0) / eduScores.length) : 0;

  const cargoMatch = profile.cargo && vacancySummary.cargo
    ? (stripAccents(profile.cargo.toLowerCase()).includes(stripAccents(vacancySummary.cargo.toLowerCase())) || stripAccents(vacancySummary.cargo.toLowerCase()).includes(stripAccents(profile.cargo.toLowerCase())) ? 100 : 40)
    : 50;
  const nivelMatch = profile.nivel && vacancySummary.nivel
    ? (profile.nivel.toLowerCase() === vacancySummary.nivel.toLowerCase() ? 100 : 50)
    : 50;
  const expMatch = avgExpScore;
  const compMatch = requiredSkills.length > 0 ? Math.min(100, Math.round((adherentSkills.length / requiredSkills.length) * 100)) : 50;
  const formMatch = academicScore;

  const dims = [
    { label: "Cargo / Profissão", icon: "💼", pct: cargoMatch, candidate: data.jobTitle || "—", vaga: vacancySummary.cargo || "—", details: `Seu cargo: ${data.jobTitle || "não informado"}. Cargo da vaga: ${vacancySummary.cargo || "não informado"}.` },
    { label: "Nível", icon: "📈", pct: nivelMatch, candidate: profile.nivel || "—", vaga: vacancySummary.nivel || "—", details: `Seu nível: ${profile.nivel || "não informado"}. Nível da vaga: ${vacancySummary.nivel || "não informado"}.` },
    { label: "Experiência", icon: "🛠️", pct: expMatch, candidate: data.experiences.length + " exp.", vaga: "Autenticidade: " + avgExpScore + "%", details: `Autenticidade das experiências: ${expScores.map((s, i) => `${data.experiences[i]?.role || "Exp " + (i + 1)}: ${s}%`).join(", ") || "nenhuma"}. Experiências: ${data.experiences.map(e => e.role).join(", ") || "nenhuma"}.` },
    { label: "Competências", icon: "🧩", pct: compMatch, candidate: adherentSkills.length + " de " + requiredSkills.length, vaga: requiredSkills.length + " exigidas", details: `Habilidades alinhadas: ${adherentSkills.join(", ") || "nenhuma"}. Exigidas: ${requiredSkills.join(", ") || "nenhuma"}. Total de competências identificadas: ${requiredSkills.length}.` },
    { label: "Formação", icon: "🎓", pct: formMatch, candidate: data.education.length + " formações", vaga: "Autenticidade: " + avgEduScore + "%", details: `Autenticidade da formação: ${eduScores.map((s, i) => `${data.education[i]?.degree || "Formação " + (i + 1)}: ${s}%`).join(", ") || "nenhuma"}. Formações: ${data.education.map(e => e.degree + " - " + e.institution).join("; ") || "nenhuma"}.` },
  ];

  const overallMatch = Math.round(dims.reduce((sum, d) => sum + d.pct, 0) / dims.length);

  const emoji = overallMatch >= 70 ? "💚" : overallMatch >= 40 ? "" : "🤔";
  const title = overallMatch >= 70 ? "Ótimo match!" : overallMatch >= 40 ? "Bom começo..." : "Pode não ser o ideal";
  const subtitle = overallMatch >= 70 ? "Seu perfil combina muito bem com esta vaga." : overallMatch >= 40 ? "Tem pontos de conexão, mas pode melhorar." : "Considere outras oportunidades mais alinhadas.";

  return (
    <div className="mt-5 space-y-4">
      <div className="overflow-hidden rounded-3xl border border-[#FFE0CC]/60 bg-gradient-to-br from-[#FF5A1F] via-[#FF7A45] to-[#FF7A45] p-6 text-white shadow-xl">
        <div className="text-center">
          <div className="text-4xl">{emoji}</div>
          <h4 className="mt-1 text-lg font-bold">{title}</h4>
          <p className="text-xs text-[#FFD5BE]">{subtitle}</p>
        </div>
        <div className="relative mx-auto mt-4 h-44 w-44">
          <svg viewBox="0 0 120 120" className="h-full w-full" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="11" />
            <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeWidth="11" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - overallMatch / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black">{overallMatch}%</span>
            <span className="text-[11px] uppercase tracking-widest text-[#FFD5BE]">match</span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Indicadores da análise</h3>
            <p className="mt-1 text-xs text-zinc-500">Cada percentual mostra a compatibilidade entre seu currículo e a vaga.</p>
          </div>
          <span className="hidden rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">0–100%</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
        {dims.map((d) => (
          <div key={d.label} className={"overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 " + (expandedDim === d.label ? "border-[#FFC7A8] bg-gradient-to-br from-[#FFF7F2] to-white shadow-md dark:border-[#FF5A1F] dark:from-[#111111]/50 dark:to-zinc-900/70" : "border-zinc-200 bg-white hover:border-[#FFE0CC] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-[#FF5A1F]")}>
            <button
              type="button"
              onClick={() => setExpandedDim(expandedDim === d.label ? null : d.label)}
              className="w-full cursor-pointer text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={"flex h-10 w-10 items-center justify-center rounded-xl text-lg " + (expandedDim === d.label ? "bg-[#FF5A1F] text-white" : "bg-[#FFF4EF] text-[#FF5A1F] dark:bg-[#FF5A1F]/50 dark:text-[#FF9A6B]")}>
                    {d.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200">{d.label}</div>
                    <div className="text-xs text-zinc-400">Você: {d.candidate} · Vaga: {d.vaga}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={"text-lg font-black " + (d.pct >= 70 ? "text-emerald-600" : d.pct >= 40 ? "text-amber-600" : "text-red-500")}>{d.pct}%</span>
                  <svg className={"h-4 w-4 text-zinc-400 transition-transform duration-300 " + (expandedDim === d.label ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className={"h-full rounded-full transition-all duration-700 " + (d.pct >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : d.pct >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-600")} style={{ width: d.pct + "%" }} />
            </div>
            {expandedDim === d.label && d.label === "Competências" && (
              <div className="mt-4 rounded-xl border border-[#FFF0E6] bg-gradient-to-br from-[#FFF7F2]/80 to-white p-4 shadow-inner dark:border-[#FF5A1F] dark:from-[#111111]/50 dark:to-zinc-900/50">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-[#FF5A1F] dark:text-[#FF9A6B]">Comparação de competências</div>
                    <p className="mt-1 text-xs text-zinc-500">Veja claramente o que a vaga exige e o que foi informado no seu currículo.</p>
                  </div>
                  <span className="rounded-full bg-[#FFF4EF] px-2.5 py-1 text-[11px] font-bold text-[#E84D13] dark:bg-[#FF5A1F]/60 dark:text-[#FFD5BE]">{adherentSkills.length} de {requiredSkills.length} alinhadas</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Exigidas pela vaga</div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-zinc-900 dark:text-amber-300">{requiredSkills.length}</span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {requiredSkills.map((skill) => {
                        const aligned = isSkillAligned(skill);
                        return <div key={skill} className={"flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold " + (aligned ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-white/80 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200")}>
                          <span className={aligned ? "text-emerald-500" : "text-amber-500"}>{aligned ? "✓" : "!"}</span>
                          <span className="min-w-0 flex-1">{skill}</span>
                          <span className={`text-[10px] font-bold ${aligned ? "text-emerald-600" : "text-amber-600"}`}>{aligned ? "alinhada no currículo" : "faltante no currículo"}</span>
                        </div>;
                      })}
                      {requiredSkills.length === 0 && <div className="text-xs text-amber-700 dark:text-amber-300">Nenhuma exigência técnica identificada.</div>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Competências do usuário</div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-zinc-900 dark:text-emerald-300">{data.skills.length}</span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {data.skills.map((skill) => {
                        const aligned = requiredSkills.some((req) => isSkillAligned(req));
                        return <div key={skill} className={"flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold " + (aligned ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-white/80 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200")}>
                          <span className={aligned ? "text-emerald-500" : "text-zinc-400"}>{aligned ? "✓" : "•"}</span>
                          <span className="min-w-0 flex-1">{skill}</span>
                          {aligned && <span className="text-[10px] font-bold text-emerald-600">atende à vaga</span>}
                        </div>;
                      })}
                      {data.skills.length === 0 && <div className="text-xs text-emerald-700 dark:text-emerald-300">Nenhuma competência foi adicionada ao currículo.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {expandedDim === d.label && ["Cargo / Profissão", "Nível", "Experiência", "Formação"].includes(d.label) && (
              <MatchDetail
                vacancyLabel={d.label === "Cargo / Profissão" ? "Cargo exigido pela vaga" : d.label === "Nível" ? "Nível exigido pela vaga" : d.label === "Experiência" ? "Experiência exigida pela vaga" : "Formação exigida pela vaga"}
                vacancyItems={d.label === "Cargo / Profissão" ? [vacancySummary.cargo || "Não identificado"] : d.label === "Nível" ? [vacancySummary.nivel || "Não identificado"] : d.label === "Experiência" ? vacancyExperience : vacancyEducation}
                userLabel={d.label === "Cargo / Profissão" ? "Cargo informado pelo usuário" : d.label === "Nível" ? "Nível do usuário" : d.label === "Experiência" ? "Experiência do usuário" : "Formação do usuário"}
                userItems={d.label === "Cargo / Profissão" ? [data.jobTitle || profile.cargo || "Não informado"] : d.label === "Nível" ? [profile.nivel || "Não informado"] : d.label === "Experiência" ? data.experiences.map((item) => `${item.role || "Experiência"}${item.company ? ` · ${item.company}` : ""}`) : data.education.map((item) => `${item.degree || "Formação"}${item.institution ? ` · ${item.institution}` : ""}`)}
              />
            )}
            {expandedDim === d.label && d.label !== "Competências" && !["Cargo / Profissão", "Nível", "Experiência", "Formação"].includes(d.label) && (
              <div className="mt-4 rounded-xl border border-[#FFF0E6] bg-gradient-to-br from-[#FFF7F2]/80 to-white p-4 text-sm text-zinc-600 shadow-inner dark:border-[#FF5A1F] dark:from-[#111111]/50 dark:to-zinc-900/50 dark:text-zinc-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-1 rounded-full bg-[#FF7A45]" />
                  <span className="text-xs font-bold uppercase tracking-wide text-[#FF5A1F] dark:text-[#FF9A6B]">Detalhes</span>
                </div>
                {d.details}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      <CompatibilityPie items={dims.map((item) => ({ label: item.label, pct: item.pct }))} />

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-5 shadow-sm dark:border-sky-900/50 dark:from-sky-950/30 dark:to-zinc-900/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-sm text-white">🎓</span>
              Melhoria da formação
            </div>
            <p className="mt-1 text-xs text-zinc-500">Veja onde fortalecer sua formação para esta vaga.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 shadow-sm dark:bg-zinc-900 dark:text-sky-300">{formMatch}% completo</span>
        </div>

        <div className="mt-5 space-y-3">
          {[
            { label: "Formação acadêmica", value: academicScore, hint: data.education.length === 0 ? "Não informada" : educationRelevance > 0 ? "Relacionada à descrição da vaga" : "Não relacionada aos requisitos encontrados" },
            { label: "Dados completos", value: educationCompleteness, hint: "Curso, instituição e ano" },
            { label: "Certificações relevantes", value: certificationScore, hint: data.certifications.length === 0 ? "Nenhuma informada" : certificationRelevance > 0 ? "Relacionadas à vaga" : "Não relacionadas à vaga" },
            { label: "Relevância para a vaga", value: formationRelevance, hint: vacancyEducation.length > 0 ? "Comparada com os requisitos" : "Comparada com as palavras-chave da vaga" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">{item.label}</span>
                <span className="font-bold text-sky-700 dark:text-sky-300">{item.value}%</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-950">
                <div className={`h-full rounded-full transition-all ${item.value >= 70 ? "bg-emerald-500" : item.value >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${item.value}%` }} />
              </div>
              <div className="mt-1 text-[10px] text-zinc-400">{item.hint}</div>
            </div>
          ))}
        </div>

      </div>

      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-zinc-900/40">
        <h5 className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">Recomendações para Entrevista</h5>
        <ul className="mt-2 space-y-2">
          {cargoMatch < 70 && (
            <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="mt-0.5 text-amber-500">→</span>
              <span>Alinhe seu título profissional com o cargo da vaga para aumentar a compatibilidade.</span>
            </li>
          )}
          {expMatch < 70 && (
            <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="mt-0.5 text-amber-500">→</span>
              <span>Detalhe mais suas experiências profissionais com conquistas e resultados mensuráveis.</span>
            </li>
          )}
          {compMatch < 70 && (
            <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="mt-0.5 text-amber-500">→</span>
              <span>Incorpore mais competências técnicas exigidas na vaga ao seu currículo.</span>
            </li>
          )}
          {formMatch < 70 && (
            <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="mt-0.5 text-amber-500">→</span>
              <span>Complete informações de formação acadêmica e certificações relevantes.</span>
            </li>
          )}
          {overallMatch >= 70 && (
            <li className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="mt-0.5 text-emerald-500">✓</span>
              <span>Seu perfil está bem alinhado! Prepare exemplos práticos para a entrevista.</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Dashboard({
  analysis,
  data,
  vaga,
  profile,
  vacancySummary,
  result,
  variant,
  applied,
  extraText,
  onAnalyze,
  onOptimize,
  onRedo,
  vacancyAnswers,
  allQuestions,
}: {
  analysis: PremiumAnalysis;
  data: ResumeData;
  vaga: string;
  profile: Profile;
  vacancySummary?: VacancyAnalysis;
  result?: Correction;
  variant: "live" | "ai";
  applied?: boolean;
  extraText?: string;
  onAnalyze?: () => void;
  onOptimize?: () => void;
  onRedo?: () => void;
  vacancyAnswers?: Record<number, string>;
  allQuestions?: { question: string; options: string[] }[];
}) {
  return (
    <div className="space-y-6">
      <TinderMatch data={data} vaga={vaga} profile={profile} vacancySummary={vacancySummary} vacancyAnswers={vacancyAnswers} allQuestions={allQuestions} />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={onOptimize} disabled={applied} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
          {applied ? "✓ Ajustes aplicados" : "Otimizar currículo para esta vaga"}
        </button>
      </div>
      {applied && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Currículo otimizado para a vaga: resumo, experiências e habilidades ajustados. Revise e baixe quando quiser.</p>
      )}
    </div>
  );
}

function RadioGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              value === o
                ? "border-[#E84D13] bg-[#FF5A1F] text-white dark:border-[#FF5A1F]"
                : "border-zinc-300 text-zinc-600 hover:border-[#FF7A45] dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PremiumAnalysisPanel({
  onAnalysisStart,
}: {
  onAnalysisStart?: () => void;
}) {
  const { data, update, replace } = useResume();
  const [, setPhase] = useState<"profile" | "vaga" | "live" | "done">("profile");
  const [profile, setProfile] = useState<Profile>({ situacao: "", cargo: "", nivel: "", area: "", objetivo: "" });
  const [vacancySummary, setVacancySummary] = useState<VacancyAnalysis>({ responsabilidadesAtribuicoes: [], requisitosQualificacoes: [], competencias: [], conhecimentosHabilidades: [], responsabilidades: [], cargo: "", nivel: "", area: "", segmento: "", perfilProcurado: "", comportamentais: [], complexidade: 0, concorrencia: "Média", sobre: [] });
  const [vacancyQuestions, setVacancyQuestions] = useState<VacancyQuestionGroup[]>([]);
  const [vacancyAnswers, setVacancyAnswers] = useState<Record<number, string>>({});
  const [vagaLoading, setVagaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Correction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [step, setStep] = useState(0);
  const [vagaLocked, setVagaLocked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const STEP_TITLES = ["Perfil", "Vaga", "Combinação", "Layout"];

  const filledVaga = data.jobDescription.trim().length > 0;
  const hasResponsabilidades = vacancySummary.responsabilidadesAtribuicoes.length > 0;
  const hasRequisitos = vacancySummary.requisitosQualificacoes.length > 0;
  const canAnalyzeVaga = filledVaga && hasResponsabilidades && hasRequisitos && !vagaLoading;
  const allQuestions = vacancyQuestions.flatMap((g) => g.questions);
  const answersBlob = allQuestions
    .map((q, i) => (vacancyAnswers[i] ? `${q.question} ${vacancyAnswers[i]}` : ""))
    .filter(Boolean)
    .join(" ");
  const live = computeLiveAnalysis(data, data.jobDescription, profile, answersBlob);
  const analysis = result ? toAnalysis(result, data, data.jobDescription, profile) : live;

  const analyzeVaga = async () => {
    if (!filledVaga) {
      setError("Cole a descrição da vaga antes de analisar.");
      return;
    }
    const userCargo = vacancySummary?.cargo?.trim() || "";
    const profileCargo = profile.cargo?.trim() || "";
    const finalCargo = userCargo || profileCargo;
    const requisitos = vacancySummary?.requisitosQualificacoes || [];
    const tituloVaga = vacancySummary?.cargo || "";
    const nivelFromTitle = tituloVaga.toLowerCase().includes("junior") || tituloVaga.toLowerCase().includes("júnior") ? "Júnior"
      : tituloVaga.toLowerCase().includes("pleno") ? "Pleno"
      : tituloVaga.toLowerCase().includes("senior") || tituloVaga.toLowerCase().includes("sênior") ? "Sênior"
      : tituloVaga.toLowerCase().includes("especialista") ? "Especialista"
      : tituloVaga.toLowerCase().includes("coordenador") ? "Coordenador"
      : tituloVaga.toLowerCase().includes("gerente") ? "Gerente"
      : tituloVaga.toLowerCase().includes("diretor") ? "Diretor"
      : "";
    setVagaLoading(true);
    try {
      const res = await fetch("/api/analyze-vacancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: data.jobDescription }),
      });
      const dataJson = (await res.json()) as { analysis?: VacancyAnalysis };
      if (dataJson?.analysis) {
        setVacancySummary({ ...dataJson.analysis, cargo: finalCargo || dataJson.analysis.cargo, nivel: nivelFromTitle || dataJson.analysis.nivel });
      } else {
        const fallback = summarizeVagaFallback(data.jobDescription, profile, requisitos, tituloVaga);
        setVacancySummary({ ...fallback, cargo: finalCargo || fallback.cargo, nivel: nivelFromTitle || fallback.nivel });
      }
    } catch {
      const fallback = summarizeVagaFallback(data.jobDescription, profile, requisitos, tituloVaga);
      setVacancySummary({ ...fallback, cargo: finalCargo || fallback.cargo, nivel: nivelFromTitle || fallback.nivel });
    }
    try {
      const qRes = await fetch("/api/vacancy-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: data.jobDescription,
          responsabilidades: vacancySummary.responsabilidadesAtribuicoes.join("\n"),
          requisitos: vacancySummary.requisitosQualificacoes.join("\n"),
        }),
      });
      const qJson = (await qRes.json()) as { groups?: VacancyQuestionGroup[] };
      if (qJson?.groups?.length) setVacancyQuestions(qJson.groups);
    } catch {
      /* keep previous */
    }
    setVagaLoading(false);
    setVagaLocked(true);
    setStep(2);
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    if (!filledVaga) {
      setError("Cole a descrição da vaga antes de iniciar a análise.");
      setLoading(false);
      return;
    }
    onAnalysisStart?.();
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request_failed");
      const json = (await res.json()) as { correction: Correction };
      setResult(json.correction);
      setPhase("done");
    } catch {
      setError("Não foi possível analisar o currículo agora. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const applyAdjustments = () => {
    if (!result) return;
    replace(applyCorrection(result, data));
    setApplied(true);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await generatePdfBlob(data);
      downloadBlob(blob, sanitizeFilename(data.fullName, "curriculo"));
    } catch {
      setError("Não foi possível gerar o PDF neste navegador. Tente outro navegador.");
    } finally {
      setIsDownloading(false);
    }
  };

  const prefillFromProfile = () => {
    const cargo = profile.cargo.trim();
    const area = profile.area.trim();
    const objetivo = profile.objetivo.trim();
    if (cargo && !data.jobTitle.trim()) update("jobTitle", cargo);
    if (!data.summary.trim()) {
      const parts = [cargo, area, objetivo].filter(Boolean);
      if (parts.length) update("summary", parts.join(" — "));
    }
  };

  const profileStrengths: string[] = [];
  const profileOpportunities: string[] = [];
  if (analysis.pillars.experiencia >= 70) profileStrengths.push("Experiência profissional sólida e relevante");
  else if (analysis.pillars.experiencia < 40) profileOpportunities.push("Detalhar mais as experiências e conquistas");
  if (analysis.pillars.competencias >= 70) profileStrengths.push("Boa cobertura de competências técnicas");
  else profileOpportunities.push("Incorporar mais competências técnicas alinhadas à vaga");
  if (analysis.pillars.formacao >= 50) profileStrengths.push("Formação e certificações presentes");
  else profileOpportunities.push("Adicionar formação e certificações relevantes");
  if (analysis.pillars.comportamental >= 50) profileStrengths.push("Competências comportamentais evidenciadas");
  else profileOpportunities.push("Destacar soft skills (liderança, comunicação, trabalho em equipe)");
  if (analysis.pillars.ats >= 70) profileStrengths.push("Currículo otimizado para ATS");
  else profileOpportunities.push("Otimizar palavras-chave para os sistemas ATS");
  if (profile.situacao) profileStrengths.push(`Situação profissional: ${profile.situacao}`);

  const canProceedStep0 = data.fullName.trim() && data.summary.trim() && (data.experiences.length > 0 || data.education.length > 0);

  return (
    <section className="min-w-0 rounded-2xl border border-[#FFE0CC] bg-gradient-to-br from-[#FFF7F2] to-[#FFE0CC] p-4 dark:border-[#E84D13] dark:from-[#111111]/40 dark:to-[#FF5A1F]/20 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A1F] text-lg text-white">✦</span>
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">Combinação Inteligente de Vagas</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Passo a passo: analise seu perfil, otimize o currículo e cruze com a vaga desejada. Avance etapa por etapa.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#E84D13] dark:text-[#FFD5BE]">Etapa {step + 1} de {STEP_TITLES.length}</span>
          <span className="text-xs font-medium text-zinc-500">{STEP_TITLES[step]}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEP_TITLES.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={"Etapa " + (i + 1) + ": " + t}
              className={"h-1.5 flex-1 rounded-full transition " + (i <= step ? "bg-[#FF5A1F]" : "bg-[#FFE0CC] dark:bg-[#FF5A1F]")}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {STEP_TITLES.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={"rounded-full px-3 py-1 text-[11px] font-semibold transition " + (i === step ? "bg-[#FF5A1F] text-white" : i < step ? "bg-[#FFF4EF] text-[#E84D13] dark:bg-[#111111] dark:text-[#FFD5BE]" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300")}
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {step === 0 && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:rounded-3xl">
            <div className="border-b border-zinc-100 bg-gradient-to-r from-[#FFF7F2] to-white px-4 py-4 dark:border-zinc-800 dark:from-[#111111]/40 dark:to-zinc-900 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF5A1F] text-sm font-bold text-white shadow-lg shadow-[0_10px_30px_rgba(255,90,31,.3)] sm:h-10 sm:w-10 sm:rounded-2xl sm:text-base">01</span>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white sm:text-base">Seu perfil profissional</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">Conte um pouco sobre sua experiência e objetivo.</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#FF5A1F] shadow-sm dark:bg-zinc-800 dark:text-[#FF9A6B]">Perfil</span>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <RadioGroup label="Qual sua situação profissional?" options={SITUACOES} value={profile.situacao} onChange={(v) => setProfile((p) => ({ ...p, situacao: v }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="p-4 pb-2">
                    <div className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Cargo que você procura</div>
                    <p className="mb-3 text-[11px] text-zinc-400">Use o nome mais próximo do seu objetivo.</p>
                    <input value={profile.cargo} onChange={(e) => setProfile((p) => ({ ...p, cargo: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#FF7A45] focus:bg-white focus:ring-2 focus:ring-[#FFF7F2]0/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900" placeholder="Ex.: Analista SAP Sênior" />
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="p-4 pb-2">
                    <div className="mb-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">Área de atuação</div>
                    <p className="mb-3 text-[11px] text-zinc-400">Em qual área você quer trabalhar?</p>
                    <input value={profile.area} onChange={(e) => setProfile((p) => ({ ...p, area: e.target.value }))} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#FF7A45] focus:bg-white focus:ring-2 focus:ring-[#FFF7F2]0/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900" placeholder="Ex.: Tecnologia" />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[#FFF0E6] bg-[#FFF7F2]/40 p-4 dark:border-[#E84D13]/50 dark:bg-[#111111]/20">
                <RadioGroup label="Qual seu nível profissional?" options={NIVEIS} value={profile.nivel} onChange={(v) => setProfile((p) => ({ ...p, nivel: v }))} />
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <RadioGroup label="Qual seu principal objetivo?" options={OBJETIVOS} value={profile.objetivo} onChange={(v) => setProfile((p) => ({ ...p, objetivo: v }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:grid-cols-4 sm:px-6">
              {[
                { icon: "📂", label: "Experiências", value: data.experiences.length, color: "purple" },
                { icon: "🛠", label: "Habilidades", value: data.skills.length, color: "emerald" },
                { icon: "🎓", label: "Formação", value: data.education.length, color: "sky" },
                { icon: "📜", label: "Certificações", value: data.certifications.length, color: "amber" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
                  <div className="flex items-center justify-between gap-2"><span className="text-base">{item.icon}</span><span className="text-xl font-black text-zinc-800 dark:text-zinc-100">{item.value}</span></div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">{item.label}</div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div className={`h-full rounded-full ${item.color === "purple" ? "bg-[#FF7A45]" : item.color === "emerald" ? "bg-emerald-500" : item.color === "sky" ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, item.value * 25)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              {!showEditor && (
                <button type="button" onClick={() => setShowEditor(true)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#FFE0CC] bg-white px-3 py-2 text-xs font-semibold text-[#E84D13] transition hover:-translate-y-0.5 hover:border-[#FF9A6B] hover:bg-[#FFF7F2] dark:border-[#FF5A1F] dark:bg-zinc-900 dark:text-[#FFD5BE] dark:hover:bg-[#111111]/40">
                  <span aria-hidden="true">✎</span> Editar currículo
                </button>
              )}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="rounded-2xl border border-[#FFE0CC] bg-white p-5 shadow-sm dark:border-[#E84D13]/50 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A1F] text-sm text-white">2</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#E84D13] dark:text-[#FFD5BE]">Descrição da Vaga</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Cole a descrição da vaga. O sistema organizará os dados em blocos para análise.</p>
            <label className="mt-3 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Título da vaga</label>
            <input
              value={vacancySummary?.cargo || ""}
              onChange={(e) => setVacancySummary((prev) => prev ? { ...prev, cargo: e.target.value } : prev)}
              disabled={vagaLocked}
              placeholder="Ex.: Analista SAP FI Sênior"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FFF7F2]0/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
            />
            <label className="mt-3 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Descrição da vaga</label>
            <textarea
              value={data.jobDescription}
              onChange={(e) => update("jobDescription", e.target.value)}
              rows={5}
              disabled={vagaLocked}
              placeholder="Cole a descrição completa da vaga do LinkedIn…"
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FFF7F2]0/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
            />
            <label className="mt-3 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Responsabilidades e Atribuições</label>
            <textarea
              value={vacancySummary ? vacancySummary.responsabilidadesAtribuicoes.join("\n") : ""}
              onChange={(e) => {
                const items = e.target.value.split("\n").filter(Boolean);
                setVacancySummary((prev) => prev ? { ...prev, responsabilidadesAtribuicoes: items } : prev);
              }}
              rows={3}
              disabled={vagaLocked}
              placeholder="Liste as responsabilidades e atribuições do cargo (uma por linha)..."
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FFF7F2]0/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
            />
            <label className="mt-3 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">Requisitos e Qualificações</label>
            <textarea
              value={vacancySummary ? vacancySummary.requisitosQualificacoes.join("\n") : ""}
              onChange={(e) => {
                const items = e.target.value.split("\n").filter(Boolean);
                setVacancySummary((prev) => prev ? { ...prev, requisitosQualificacoes: items } : prev);
              }}
              rows={3}
              disabled={vagaLocked}
              placeholder="Liste os requisitos e qualificações necessários (um por linha)..."
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-[#FF7A45] focus:ring-2 focus:ring-[#FFF7F2]0/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800"
            />
            <div className="mt-3">
              <button type="button" onClick={analyzeVaga} disabled={!canAnalyzeVaga || vagaLocked} className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A1F] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50">
                {vagaLoading ? "Analisando…" : "Analisar Vaga"}
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <Dashboard
            analysis={analysis}
            data={data}
            vaga={data.jobDescription}
            profile={profile}
            vacancySummary={vacancySummary}
            result={result ?? undefined}
            variant={result ? "ai" : "live"}
            applied={applied}
            extraText={answersBlob}
            onAnalyze={analyze}
            onOptimize={() => setShowEditor(true)}
            onRedo={analyze}
            vacancyAnswers={vacancyAnswers}
            allQuestions={allQuestions}
          />
        )}
        {step === 3 && (
          <div className="rounded-2xl border border-[#FFE0CC] bg-white p-5 shadow-sm dark:border-[#E84D13]/50 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A1F] text-sm text-white">4</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#E84D13] dark:text-[#FFD5BE]">Escolha o Layout do Currículo</h3>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Selecione o modelo visual e veja uma prévia do seu currículo.</p>
            <div className="mt-4">
              <TemplatePicker showHeader={false} />
            </div>

            <div className="mt-6">
              <ResumePreview />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {!showEditor && (
                <button type="button" onClick={() => setShowEditor(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFE0CC] bg-white px-3 py-2 text-xs font-semibold text-[#E84D13] transition hover:border-[#FF9A6B] hover:bg-[#FFF7F2] dark:border-[#FF5A1F] dark:bg-zinc-900 dark:text-[#FFD5BE] dark:hover:bg-[#111111]/40">
                  <span aria-hidden="true">✎</span> Editar currículo
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] transition hover:-translate-y-0.5 hover:from-[#E84D13] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? "Gerando PDF…" : "⬇ Baixar PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto"
        >
          ← Voltar
        </button>
        {step < 3 ? (
          <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
            {step === 0 && !canProceedStep0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Preencha nome, resumo e pelo menos uma experiência ou formação</p>
            )}
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={step === 0 && !canProceedStep0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Próximo →
            </button>
          </div>
        ) : null}
      </div>

      {showEditor && (
        <div className="mt-6 rounded-2xl border border-[#FFE0CC] bg-gradient-to-br from-[#FFF7F2] to-[#FFE0CC] p-5 dark:border-[#E84D13] dark:from-[#111111]/40 dark:to-[#FF5A1F]/20 sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-tight">Editar Currículo</h3>
            <button type="button" onClick={() => setShowEditor(false)} className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Fechar
            </button>
          </div>
          <ResumeForm onComplete={() => setShowEditor(false)} />
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
      )}
    </section>
  );
}
