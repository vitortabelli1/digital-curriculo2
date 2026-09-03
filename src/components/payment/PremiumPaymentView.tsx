"use client";

import { useEffect, useState } from "react";
import { loadPremiumCheckout, savePremiumCheckout } from "@/lib/download-store";

export function PremiumPaymentView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  // Cria (ou reutiliza) um checkout do plano Premium. Reutilizamos o checkout
  // pendente salvo na sessão (por até 20 min) para que, ao voltar do Abacate
  // via completionUrl, ainda seja possível reabrir o mesmo pagamento.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const existing = loadPremiumCheckout();
      if (existing) {
        setPayUrl(existing.url);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/abacate/checkout", { method: "POST" });
        const body = (await res.json()) as { url?: string; id?: string; error?: string };
        if (cancelled) return;
        if (body.url && body.id) {
          setPayUrl(body.url);
          savePremiumCheckout({ id: body.id, url: body.url });
          setLoading(false);
        } else {
          setError(body.error || "Não foi possível gerar o pagamento.");
        }
      } catch {
        if (!cancelled) setError("Não foi possível gerar o pagamento.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Redireciona a PRÓPRIA aba para a página do Abacate. Não funciona como
  // iframe porque o Chrome bloqueia (Private Network Access) em localhost.
  // Após o pagamento, o Abacate retorna para a tela do plano Premium por meio
  // do completionUrl (?premium-paid=1), sem depender de botão manual.
  const openPayment = () => {
    if (!payUrl) return;
    window.location.href = payUrl;
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      <div className="w-full text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Pagamento do Plano Premium
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-zinc-600 dark:text-zinc-400">
          Clique em pagar para concluir a compra. Assim que o pagamento for
          confirmado, você voltará automaticamente para esta página.
        </p>
      </div>

      {error ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5A1F] to-[#FF7A45] text-2xl font-bold text-white">
            R$
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              Plano Premium — R$ 69,99
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Análise inteligente da vaga + comparação automática
            </p>
          </div>

          <button
            type="button"
            onClick={openPayment}
            disabled={!payUrl || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[0_10px_30px_rgba(255,90,31,.25)] transition-all hover:from-[#E84D13] hover:to-[#FF7A45] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Gerando pagamento..." : "Pagar agora"}
            {!loading && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Voltar aos planos
        </button>
      </div>
    </div>
  );
}
