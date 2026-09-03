"use client";

import type { PlanId } from "@/lib/plans";

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  highlight?: boolean;
  highlightFeature: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "resume",
    name: "Básico",
    price: "R$ 19,99",
    highlight: true,
    highlightFeature: "Download imediato em PDF",
    features: [
      "Currículo pronto para enviar às empresas",
      "Modelos profissionais aprovados por recrutadores",
      "Escolha entre 20 layouts modernos",
      "Visualização completa liberada após pagamento",
      "Download imediato em PDF",
      "Sem mensalidade",
      "Acesso instantâneo",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 69,99",
    highlight: true,
    highlightFeature: "Análise inteligente da vaga desejada",
    features: [
      "Tudo do plano Básico",
      "Análise inteligente da vaga desejada",
      "Comparação automática entre currículo e descrição da vaga",
      "Pontuação de compatibilidade de 0% a 100%",
      "Gráfico visual de aderência à vaga",
      "Destaque das competências mais relevantes para a posição",
      "Recomendações personalizadas para aumentar as chances de entrevista",
      "Sem mensalidade",
    ],
  },
];

function parsePrice(price: string): { intPart: string; cents: string } {
  const amount = price.replace("R$ ", "").trim();
  const [intPart, cents] = amount.split(",");
  return { intPart, cents: cents ?? "00" };
}

export function PlanSelector({
  onSelect,
}: {
  onSelect: (planId: PlanId) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PlanCards onSelect={onSelect} />
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

export function PlanCards({
  onSelect,
  disabled,
}: {
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
      {PLANS.map((plan) => {
        const { intPart, cents } = parsePrice(plan.price);
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-[0_10px_40px_rgba(0,0,0,.08)] ${
              plan.highlight
                ? "border-[#FF5A1F]/40"
                : "border-[#ECECEC]"
            }`}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-[#FF5A1F] via-[#FF7A45] to-[#FF5A1F]" />

            <div className="flex flex-1 flex-col p-5 sm:p-7">
              <h3 className="text-base font-bold tracking-tight text-[#111111] sm:text-lg">
                {plan.name}
              </h3>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-[#111111] sm:text-xl">
                  R$
                </span>
                <span className="text-4xl font-extrabold leading-none tracking-tight text-[#111111] sm:text-5xl">
                  {intPart}
                  <span className="text-2xl sm:text-3xl">,{cents}</span>
                </span>
              </div>

              <ul className="mt-5 space-y-2 border-t border-[#ECECEC] pt-4 text-xs text-[#6B7280] sm:mt-6 sm:space-y-2.5 sm:pt-5 sm:text-sm">
                {plan.features.map((f) => {
                  return (
                    <li
                      key={f}
                      className="flex items-start gap-2.5"
                    >
                      <CheckIcon />
                      {f}
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={() => onSelect(plan.id)}
                  disabled={disabled}
                  className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] py-3 text-[13px] font-bold text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(255,90,31,.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5 sm:text-sm"
                >
                  Escolher {plan.name}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Acesso liberado na hora, direto no seu navegador
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
