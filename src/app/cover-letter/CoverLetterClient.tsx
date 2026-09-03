"use client";

import { useState } from "react";
import Link from "next/link";
import { loadResumeData } from "@/lib/download-store";
import { Button } from "@/components/ui/Button";

export function CoverLetterClient({ paid }: { paid: boolean }) {
  const [letter, setLetter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setCopied(false);
    try {
      const data = loadResumeData();
      if (!data) {
        throw new Error("Dados do currículo não encontrados. Preencha o formulário novamente.");
      }
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.letter) {
        throw new Error("Não foi possível gerar a carta. Tente novamente.");
      }
      setLetter(json.letter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar carta.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  const handleDownloadTxt = () => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "carta-de-apresentacao.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
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

      <main className="mx-auto max-w-2xl px-4 py-12">
        {!paid ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Não foi possível confirmar o pagamento da carta de apresentação.
            Se já pagou, abra esta página pelo link do Stripe.
          </div>
        ) : letter ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Sua carta de apresentação
              </h1>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Escrita por IA ✨
              </span>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
              <p className="whitespace-pre-line text-[15px] leading-7 text-zinc-800 dark:text-zinc-100">
                {letter}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleCopy}>{copied ? "Copiado!" : "Copiar carta"}</Button>
              <Button variant="secondary" onClick={handleDownloadTxt}>
                Baixar como .txt
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </>
        ) : (
          <div className="flex flex-col items-center py-10 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Carta de apresentação por IA
            </h1>
            <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
              Sua carta será escrita com base nos dados do seu currículo,
              destacando suas experiências e habilidades para o cargo desejado.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-8 px-8"
            >
              {isGenerating ? "Escrevendo com IA..." : "Gerar minha carta"}
            </Button>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}