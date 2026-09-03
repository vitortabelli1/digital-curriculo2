"use client";

import { useEffect, useRef, useState } from "react";
import { useResume } from "@/lib/resume-context";
import { saveResumeData } from "@/lib/download-store";
import {
  applyCorrection,
  buildDiff,
  type Correction,
} from "@/lib/corrections";
import { downloadBlob, generatePdfBlob, sanitizeFilename } from "@/lib/pdf";
import { getTemplate } from "@/lib/templates";
import { TemplatePicker } from "./TemplatePicker";
import { ResumePreview } from "./ResumePreview";
import { ResumeForm } from "./ResumeForm";
import { SavedModelsBar } from "./SavedModelsBar";
import type { ResumeData } from "@/lib/types";

type Stage = "home" | "correcting" | "results" | "layout";

const STEPS = [
  "Correção automática por IA",
  "🤖 Corrige ortografia, gramática e pontuação",
  "🤖 Corrige concordância verbal e nominal",
  "🤖 Reescreve o resumo profissional",
  "🤖 Otimiza experiências profissionais",
  "🤖 Identifica e aplica palavras-chave da vaga",
  "🤖 Analisa compatibilidade com a vaga",
  "Resultado pronto",
];

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function PremiumFlow({ onBack }: { onBack: () => void }) {
  const { data, replace } = useResume();
  const [stage, setStage] = useState<Stage>("home");
  const [stepIndex, setStepIndex] = useState(0);
  const [correctedData, setCorrectedData] = useState<ResumeData | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runCorrection = async () => {
    setStage("correcting");
    setStepIndex(0);
    await sleep(500);
    if (!mounted.current) return;
    setStepIndex(1);

    let result: Correction = {};
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      result = (json?.correction ?? {}) as Correction;
      setIsFallback(json?.fallback === true);
    } catch {
      // IA indisponível → usa dados originais
      setIsFallback(true);
    }
    setCorrection(result);

    if (!mounted.current) return;
    setStepIndex(2);
    await sleep(600);
    if (!mounted.current) return;
    setStepIndex(3);
    await sleep(600);
    if (!mounted.current) return;
    setStepIndex(4);
    await sleep(600);
    if (!mounted.current) return;
    setStepIndex(5);
    await sleep(700);
    if (!mounted.current) return;
    setStepIndex(6);
    await sleep(700);
    if (!mounted.current) return;
    setStepIndex(7);
    await sleep(500);
    if (!mounted.current) return;

    const applied = applyCorrection(result, data);
    setCorrectedData(applied);
    saveResumeData(applied);
    setStage("results");
  };

  const handleCorrect = () => {
    if (stage === "home") runCorrection();
  };

  const handleDownload = async (override?: ResumeData) => {
    if (isDownloading || !correctedData) return;
    setIsDownloading(true);
    setError(null);
    try {
      const finalData = override ?? { ...data };
      const blob = await generatePdfBlob(finalData);
      saveResumeData(finalData);
      downloadBlob(blob, sanitizeFilename(finalData.fullName, getTemplate(finalData.templateId).name));
    } catch {
      setError("Não foi possível gerar o PDF neste navegador. Tente outro navegador.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleChooseLayout = () => {
    if (correctedData) replace(correctedData);
    setStage("layout");
  };

  const diffItems = correction && correctedData ? buildDiff(correction, data) : [];

  const highlightChips =
    correction && correctedData
      ? [
          correction.summary && correction.summary !== data.summary
            ? "Resumo otimizado"
            : null,
          correction.jobTitle && correction.jobTitle !== data.jobTitle
            ? "Cargo aperfeiçoado"
            : null,
          correction.experiences?.some(
            (e) => e.description && e.description !== data.experiences.find((x) => x.id === e.id)?.description
          )
            ? "Experiências melhoradas"
            : null,
          correction.skills?.length ? "Competências destacadas" : null,
          (correction.atsKeywords?.length ?? 0) > 0
            ? "Palavras-chave ATS aplicadas"
            : null,
        ].filter(Boolean)
      : [];

  return (
    <div className="mx-auto max-w-3xl">
      {(stage === "home" || stage === "correcting" || stage === "results" || stage === "layout") && (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Voltar aos planos
        </button>
      )}

      {stage === "home" && (
        <div className="space-y-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              ✦ Plano Premium ⭐
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Otimize seu currículo com IA
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
              Corrija e melhore seu currículo automaticamente e descubra o
              quanto ele está aderente à vaga desejada.
            </p>
          </div>

          <div className="rounded-3xl border-2 border-[#FF5A1F]/40 bg-gradient-to-br from-[#FFF7F2] via-white to-white p-6 shadow-lg shadow-[0_10px_40px_rgba(255,90,31,.1)] dark:border-[#FF5A1F]/30 dark:from-[#111111]/40 dark:via-zinc-900 dark:to-zinc-900 dark:shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] bg-clip-text text-xl font-bold text-transparent dark:from-[#FF5A1F] dark:to-[#FF5A1F]">
                🤖 Corrigir com IA
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4EF] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#111111] dark:bg-[#111111] dark:text-[#FF9A6B]">
                ⚡ Análise automática completa
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              A IA analisa o currículo em profundidade, identifica todas as
              falhas abaixo, corrige e mostra o resultado.
            </p>
            <ul className="mt-4 grid gap-1.5 text-sm text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
              <li>✅ Corrige erros ortográficos</li>
              <li>✅ Corrige erros gramaticais</li>
              <li>✅ Corrige pontuação</li>
              <li>✅ Corrige concordância verbal e nominal</li>
              <li>✅ Melhora frases pouco profissionais</li>
              <li>✅ Reescreve o resumo profissional</li>
              <li>✅ Otimiza experiências profissionais</li>
              <li>✅ Destaca competências relevantes</li>
            </ul>
            <button
              type="button"
              onClick={handleCorrect}
              className="mt-5 inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-10 text-base font-bold text-white shadow-md shadow-[0_10px_40px_rgba(255,90,31,.25)] transition-all hover:from-[#E84D13] hover:to-[#FF7A45] hover:shadow-lg dark:shadow-none"
            >
              🤖 Corrigir com IA
            </button>
          </div>
        </div>
      )}

      {stage === "correcting" && (
        <div className="mx-auto max-w-lg">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              ✦ Plano Premium ⭐
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              IA corrigindo seu currículo
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Aguarde alguns segundos enquanto as melhorias são aplicadas.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="space-y-3.5">
              {STEPS.map((label, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={label} className="flex items-center gap-3">
                    {done ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        ✓
                      </span>
                    ) : active ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E84D13] border-t-transparent" />
                      </span>
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-200 dark:border-zinc-700" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        done
                          ? "text-zinc-800 dark:text-zinc-100"
                          : active
                            ? "text-[#FF5A1F] dark:text-[#FF5A1F]"
                            : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {stage === "results" && correctedData && correction && (
        <div>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                ✦ Plano Premium ⭐
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                ✓ Correções aplicadas
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Análise do seu currículo
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
              Revise as alterações realizadas pela IA antes de escolher o
              modelo e baixar o PDF.
            </p>
          </div>

          {highlightChips.length > 0 && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {highlightChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  ✅ {chip}
                </span>
              ))}
            </div>
          )}

          {isFallback && (
            <div className="mx-auto mb-6 max-w-xl rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              ⚠️ Modo demonstração: chave da OpenAI não configurada. Foram
              aplicadas correções automáticas de formatação — adicione a
              OPENAI_API_KEY para a correção completa por IA (gramática,
              ortografia e otimização para a vaga).
            </div>
          )}

          <div className="mx-auto mb-6 max-w-xl space-y-4">
            {(correction.issues?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-white p-4 text-left dark:border-amber-900/50 dark:bg-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  🔍 Problemas identificados e corrigidos
                </h3>
                <ul className="mt-2.5 space-y-1.5">
                  {correction.issues?.map((issue, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-zinc-600 dark:text-zinc-300"
                    >
                      <span className="mt-0.5 text-emerald-500">✓</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {typeof correction.fitScore === "number" && (
              <div className="rounded-2xl border border-[#FFE0CC] bg-white p-4 text-left dark:border-[#111111] dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                    📊 Compatibilidade com a vaga
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      correction.fitScore >= 75
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : correction.fitScore >= 50
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-[#FFF4EF] text-[#111111] dark:bg-[#111111] dark:text-[#FF9A6B]"
                    }`}
                  >
                    {correction.fitScore}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${
                      correction.fitScore >= 75
                        ? "bg-emerald-500"
                        : correction.fitScore >= 50
                          ? "bg-amber-500"
                          : "bg-[#FF5A1F]"
                    }`}
                    style={{ width: `${correction.fitScore}%` }}
                  />
                </div>
                {correction.fitFeedback && (
                  <p className="mt-3 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {correction.fitFeedback}
                  </p>
                )}
              </div>
            )}

            {(correction.foundSkills?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  ✅ Competências encontradas
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {correction.foundSkills?.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(correction.missingSkills?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  ⚠ Competências recomendadas
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {correction.missingSkills?.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(correction.suggestions?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  🤖 Sugestões da IA para melhorar o currículo
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {correction.suggestions?.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-zinc-600 dark:text-zinc-300"
                    >
                      <span className="mt-0.5 text-[#FF5A1F]">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(correction.atsKeywords?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                  🔑 Palavras-chave da vaga aplicadas
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {correction.atsKeywords?.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-[#FFF7F2] px-2.5 py-1 text-xs font-medium text-[#111111] dark:bg-[#111111] dark:text-[#FF9A6B]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <h2 className="text-base font-bold text-zinc-700 dark:text-zinc-200">
                👀 Comparação das Correções
              </h2>
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Currículo Original
                </div>
                <ResumePreview data={data} />
              </div>
              <div>
                <div className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-[#FF5A1F] dark:text-[#FF5A1F]">
                  Currículo Corrigido pela IA
                </div>
                <ResumePreview data={correctedData} />
              </div>
            </div>
          </div>

          {diffItems.length > 0 && (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                ✍️ Alterações realizadas
              </h3>
              <ul className="mt-3 space-y-3">
                {diffItems.map((d, i) => (
                  <li key={i} className="text-[13px]">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-200">
                      {d.field}
                    </div>
                    <div className="mt-0.5 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-zinc-500 line-through dark:bg-zinc-800/60 dark:text-zinc-500">
                      {d.before || "(vazio)"}
                    </div>
                    <div className="mt-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {d.after}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleChooseLayout}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#111111]"
            >
              Escolher layout Premium →
            </button>
          </div>
        </div>
      )}

      {stage === "layout" && correctedData && (
        <div>
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                ✦ Plano Premium ⭐
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                ✓ Currículo desbloqueado
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Escolha o layout Premium
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
              Seu currículo foi otimizado pela IA. Selecione um modelo, edite
              seus dados se quiser e baixe o PDF.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <TemplatePicker showHeader={false} onSelect={() => {}} />
            </div>
            <div>
              <div className="mb-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                ✏️ Edite seu currículo — desbloqueado
              </div>
              <ResumeForm
                onComplete={() =>
                  downloadRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
              />
            </div>
            <div className="lg:sticky lg:top-8 lg:self-start">
              <div className="mb-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                👀 Pré-visualização em tempo real
              </div>
              <ResumePreview data={data} />
            </div>
          </div>

          <div ref={downloadRef} className="mt-10">
            <SavedModelsBar
              currentTemplateId={data.templateId}
              currentData={data}
              maxModels={Number.POSITIVE_INFINITY}
              isDownloading={isDownloading}
              error={error}
              onDownload={handleDownload}
            />
          </div>
        </div>
      )}
    </div>
  );
}