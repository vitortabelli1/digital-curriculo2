"use client";

import { useState } from "react";
import { ResumeProvider } from "@/lib/resume-context";
import { PlanSelector } from "@/components/resume/PlanSelector";
import { getPlan, type PlanId } from "@/lib/plans";
import { BasicFlow } from "@/components/resume/BasicFlow";
import { PaymentView } from "@/components/payment/PaymentView";
import { HomeLanding } from "@/components/landing/HomeLanding";
import { saveResumeData, saveSelectedPlan } from "@/lib/download-store";
import { downloadBlob, generatePdfBlob, sanitizeFilename } from "@/lib/pdf";
import { getTemplate } from "@/lib/templates";
import type { ResumeData } from "@/lib/types";

type View = "landing" | "plans" | "payment" | "basic";

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [planId, setPlanId] = useState<PlanId>("resume");
  const [isDownloading, setIsDownloading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  const handlePlanSelect = (selected: PlanId) => {
    setFlowError(null);
    setPlanId(selected);
    saveSelectedPlan(selected);
    // Ambos os planos pagam pelo Mercado Pago (Payment Brick na própria página).
    setView("payment");
  };

  const handleDownload = async (data: ResumeData) => {
    if (isDownloading) return;
    setIsDownloading(true);
    setFlowError(null);

    try {
      const blob = await generatePdfBlob(data);
      saveResumeData(data);
      downloadBlob(blob, sanitizeFilename(data.fullName, getTemplate(data.templateId).name));
    } catch {
      setFlowError(
        "Não foi possível gerar o PDF neste navegador. Tente novamente com outro navegador."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ResumeProvider>
      {view === "landing" && (
        <HomeLanding onStart={() => setView("plans")} onSelectPlan={handlePlanSelect} />
      )}

      {view !== "landing" && (
        <div className="min-h-screen bg-[#F8F8F8]">
          <header className="border-b border-[#ECECEC] bg-white/85 backdrop-blur-[12px]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <button
                type="button"
                onClick={() => setView("landing")}
                className="flex cursor-pointer items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-sm font-bold text-white">
                  CV
                </span>
                <span className="text-lg font-bold tracking-tight text-[#111111]">
                  eCurrículo <span className="text-[#111111]">Digital</span>
                </span>
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-[1240px] px-4 py-10 sm:py-14">
            {view === "plans" && (
              <div className="flex flex-col items-center gap-6">
                <PlanSelector onSelect={handlePlanSelect} />
                <button
                  type="button"
                  onClick={() => setView("landing")}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  ← Voltar
                </button>
              </div>
            )}

            {view === "payment" && (
              <PaymentView
                planId={planId}
                onBack={() => setView("plans")}
                onSuccess={() => setView("basic")}
              />
            )}

            {view === "basic" && (
              <BasicFlow
                planId={planId}
                onBack={() => setView("plans")}
                isDownloading={isDownloading}
                error={flowError}
                onDownload={handleDownload}
              />
            )}
          </main>
        </div>
      )}
    </ResumeProvider>
  );
}
