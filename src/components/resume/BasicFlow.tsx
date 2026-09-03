"use client";

import { useRef, useState } from "react";
import { useResume } from "@/lib/resume-context";
import { getTemplate } from "@/lib/templates";
import { TemplatePicker } from "./TemplatePicker";
import { ResumeForm } from "./ResumeForm";
import { ResumePreview } from "./ResumePreview";
import { PremiumAnalysisPanel } from "./PremiumAnalysisPanel";
import type { PlanId } from "@/lib/plans";
import type { ResumeData } from "@/lib/types";

export function BasicFlow({
  planId,
  onBack,
  isDownloading,
  error,
  onDownload,
}: {
  planId: PlanId;
  onBack: () => void;
  isDownloading: boolean;
  error: string | null;
  onDownload: (data: ResumeData) => void;
}) {
  const { data } = useResume();
  const [chosen, setChosen] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const template = getTemplate(data.templateId);
  const downloadRef = useRef<HTMLDivElement>(null);
  const isPremium = planId === "premium";

  return (
    <div className="mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Voltar aos planos
      </button>

      <div className="mb-8 text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {isPremium ? "Plano Premium" : "Plano Básico"}
          </span>
        </div>
        {isPremium && !analysisStarted ? (
          <>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Preencha seus dados e compare com a vaga
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
              Edite suas informações no formulário e cole a descrição da vaga
              desejada para iniciar a análise inteligente do seu perfil.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Escolha o layout e edite seu currículo
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
              {chosen
                ? `Modelo "${template.name}" selecionado — edite seus dados e baixe o PDF quando estiver pronto.`
                : "Selecione um dos 20 modelos profissionais e edite seus dados para baixar."}
            </p>
          </>
        )}
      </div>

      {isPremium && (
        <PremiumAnalysisPanel onAnalysisStart={() => setAnalysisStarted(true)} />
      )}

      {!isPremium && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FFE0CC] bg-gradient-to-r from-[#FFF4EF] to-white px-4 py-4 shadow-sm sm:px-5">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#E84D13]">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF5A1F] text-sm text-white">CV</span>
                Monte seu currículo profissional
              </div>
              <p className="mt-1 text-xs text-zinc-500">Escolha um modelo, preencha seus dados e baixe em PDF.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">1. Escolha o design</h2>
                <p className="mt-1 text-xs text-zinc-500">Selecione o modelo que combina com você.</p>
              </div>
              <TemplatePicker showHeader={false} onSelect={() => setChosen(true)} />
            </div>

            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">2. Preencha seus dados</h2>
                <p className="mt-1 text-xs text-zinc-500">Edite as informações do seu currículo.</p>
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

            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30 sm:p-5 lg:sticky lg:top-8 lg:self-start">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">3. Confira o resultado</h2>
                <p className="mt-1 text-xs text-zinc-500">Seu currículo atualizado em tempo real.</p>
              </div>
              <ResumePreview />
            </div>

          </div>

          <div ref={downloadRef} className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => onDownload(data)}
              disabled={isDownloading}
              className="group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-8 text-base font-semibold text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] transition-all hover:-translate-y-0.5 hover:from-[#E84D13] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "Gerando PDF…" : "Baixar PDF"}
            </button>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              Seus dados são salvos automaticamente — baixe seu currículo quando quiser.
            </p>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
