"use client";

import { useState } from "react";

export function CoverLetterUpsell() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "cover-letter" }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Erro ao iniciar pagamento.");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao iniciar pagamento."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-10 w-full max-w-xl rounded-3xl border border-[#FFE0CC] bg-gradient-to-br from-[#FFF7F2] to-white p-6 text-left dark:border-[#111111] dark:from-[#111111] dark:to-zinc-900">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#FF5A1F] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Oferta especial
        </span>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          por apenas mais R$ 9,90
        </span>
      </div>
      <h2 className="mt-3 text-xl font-bold tracking-tight">
        Adicione sua carta de apresentação ✍️
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Uma carta personalizada, escrita por IA com base no seu perfil e na
        vaga desejada. Aumente suas chances de ser notado pelos recrutadores.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>• Escrita sob medida com IA (GPT-4o)</li>
        <li>• Pronta para copiar ou baixar</li>
        <li>• Entrega imediata após o pagamento</li>
      </ul>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="mt-5 w-full rounded-xl bg-[#FF5A1F] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Abrindo checkout..." : "Quero minha carta — R$ 9,90"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}