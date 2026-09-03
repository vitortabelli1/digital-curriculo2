"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadResumeData, saveResumeData } from "@/lib/download-store";
import { downloadBlob, generatePdfBlob, sanitizeFilename } from "@/lib/pdf";
import type { ResumeData } from "@/lib/types";
import {
  applyCorrection,
  buildDiff,
  type Correction,
  type DiffItem,
} from "@/lib/corrections";
import { Button } from "@/components/ui/Button";
import { CoverLetterUpsell } from "@/components/resume/CoverLetterUpsell";

export function SuccessClient({
  paid,
  product,
}: {
  paid: boolean;
  product: string;
}) {
  const router = useRouter();
  const isPremium = product === "resume-premium";

  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null);
  const [correctedData, setCorrectedData] = useState<ResumeData | null>(null);

  const getStoredData = (): ResumeData | null => {
    const data = loadResumeData();
    if (!data) {
      setError("Dados do currículo não encontrados. Preencha o formulário novamente.");
    }
    return data;
  };

  const handleCorrect = async () => {
    if (isCorrecting) return;
    const data = getStoredData();
    if (!data) return;

    setIsCorrecting(true);
    setError(null);
    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error("Não foi possível corrigir o currículo.");
      }
      const correction = json.correction as Correction;
      const diff = buildDiff(correction, data);
      setDiffs(diff);
      setCorrectedData(applyCorrection(correction, data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao corrigir currículo.");
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleDownload = async (useCorrected = false) => {
    if (isDownloading) return;
    const data = useCorrected ? correctedData : (getStoredData() ?? undefined);
    if (!data) return;

    setIsDownloading(true);
    setError(null);
    try {
      if (useCorrected && correctedData) {
        saveResumeData(correctedData);
      }
      const blob = await generatePdfBlob(correctedData ?? data);
      downloadBlob(blob, sanitizeFilename(correctedData?.fullName ?? data.fullName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!paid) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header />
        <main className="mx-auto max-w-xl px-4 py-16">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Não foi possível confirmar o pagamento. Se já pagou, verifique se
            abriu esta página pelo link do Stripe.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-950">
          ✅
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Pagamento confirmado!
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {isPremium
            ? "Seu plano Premium inclui a correção profissional por IA. Vamos começar?"
            : "Obrigado! Seu currículo em PDF está pronto. Clique abaixo para baixar."}
        </p>

        {isPremium && diffs === null ? (
          <div className="mt-8">
            <Button onClick={handleCorrect} disabled={isCorrecting} className="px-8">
              {isCorrecting ? "Corrigindo com IA..." : "Corrigir meu currículo com IA"}
            </Button>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              A IA revisa resumo, descrições de experiência, cargo e
              habilidades — mantendo seus fatos originais.
            </p>
          </div>
        ) : null}

        {isPremium && diffs !== null && diffs.length > 0 ? (
          <div className="mt-8 w-full text-left">
            <h2 className="text-lg font-bold tracking-tight">
              Melhorias sugeridas pela IA
            </h2>
            <div className="mt-4 space-y-4">
              {diffs.map((d, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {d.field}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400 line-through decoration-red-300">
                    {d.before}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed font-medium text-emerald-700 dark:text-emerald-300">
                    {d.after}
                  </p>
                </div>
              ))}
            </div>
            <Button
              onClick={() => handleDownload(true)}
              disabled={isDownloading}
              className="mt-6 w-full"
            >
              {isDownloading ? "Aplicando e gerando PDF..." : "Aplicar correções e baixar PDF"}
            </Button>
          </div>
        ) : null}

        {isPremium && diffs !== null && diffs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Ótima notícia: seu currículo já está com texto profissional. Nenhuma
            correção necessária.
          </div>
        ) : null}

        {(!isPremium || (isPremium && diffs !== null)) && (
          <div className="mt-8 flex flex-col gap-3">
            {!isPremium && (
              <Button
                onClick={() => handleDownload(false)}
                disabled={isDownloading}
                className="px-8"
              >
                {isDownloading ? "Gerando PDF..." : "Baixar meu PDF"}
              </Button>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Voltar ao início
            </button>
          </div>
        )}

        {(!isPremium || (isPremium && diffs !== null)) && <CoverLetterUpsell />}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-[#111111] bg-gradient-to-r from-[#111111] to-[#111111]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#111111]">
              CV
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
                eCurrículo <span className="text-white">Digital</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}