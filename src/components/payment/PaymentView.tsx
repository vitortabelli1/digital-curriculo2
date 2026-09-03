"use client";

import { useState } from "react";
import { getPlan, type PlanId } from "@/lib/plans";
import { publicKeyForPlan } from "@/lib/mp-init";
import { PaymentStatusScreen } from "./PaymentStatusScreen";
import { PaymentBrick } from "./PaymentBrick";

type Status = "paying" | "waiting" | "approved" | "rejected" | "error";

export function PaymentView({
  planId,
  onBack,
  onSuccess,
}: {
  planId: PlanId;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const plan = getPlan(planId);
  const AMOUNT = plan.amount;
  const [status, setStatus] = useState<Status>("paying");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [errorReason, setErrorReason] = useState<"sdk" | "brick">("brick");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setPaymentId(null);
    setStatus("paying");
    setErrorMessage(null);
    setErrorReason("brick");
  };

  const handleCreated = ({
    paymentId: id,
    status: createStatus,
  }: {
    paymentId: number;
    status: string;
  }) => {
    setPaymentId(id);
    if (createStatus === "approved") {
      setStatus("approved");
      setTimeout(() => onSuccess(), 2500);
    } else if (createStatus === "rejected" || createStatus === "cancelled") {
      setStatus("rejected");
    } else {
      setStatus("waiting");
    }
  };

  const handleStatusChange = (nextStatus: string) => {
    if (nextStatus === "approved") {
      setStatus("approved");
      setTimeout(() => onSuccess(), 2500);
    } else {
      setStatus("rejected");
    }
  };

  const handleBrickError = (reason: "sdk" | "brick", message?: string) => {
    setErrorReason(reason);
    setErrorMessage(message ?? null);
    setStatus("error");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Voltar aos planos
      </button>

      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#111111] to-[#111111] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Plano {plan.name}
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {status === "approved" ? "Pagamento aprovado" : "Pagamento"}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pagamento único de{" "}
          <span className="font-bold text-[#111111] dark:text-[#FF5A1F]">
            R$ {plan.amount.toFixed(2).replace(".", ",")}
          </span>{" "}
          para liberar seu currículo.
        </p>
      </div>

      {/* Cartão de crédito/débito (Brick oficial) */}
      {status === "paying" && paymentId === null && (
        <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
           <PaymentBrick
            amount={AMOUNT}
            planId={planId}
            paymentMethods={{ creditCard: "all", debitCard: "all" }}
            onCreated={handleCreated}
            onError={handleBrickError}
          />
        </div>
      )}

      {/* Status (pendente de confirmação) */}
      {status === "waiting" && paymentId && (
        <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-900 dark:bg-amber-950">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Aguardando confirmação do pagamento...
            </p>
          </div>
          <PaymentStatusScreen
            paymentId={paymentId}
            publicKey={publicKeyForPlan(planId)}
            planId={planId}
            onStatusChange={handleStatusChange}
            onError={(message) => {
              setErrorReason("brick");
              setErrorMessage(message ?? null);
              setStatus("error");
            }}
          />
        </div>
      )}

      {status === "rejected" && (
        <div className="mx-auto max-w-md">
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-900 dark:bg-red-950">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              Pagamento não aprovado. Tente novamente.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-6 text-sm font-semibold text-white transition-colors hover:from-[#E84D13] hover:to-[#FF7A45]"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {status === "approved" && (
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            ✅ Pagamento confirmado com sucesso! Agora você pode editar seu
            currículo e utilizar todos os designs disponíveis.
          </p>
          <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
            Redirecionando para a edição do currículo...
          </p>
        </div>
      )}

      {status === "error" && (
          <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-lg font-bold text-red-700 dark:text-red-300">
            Não foi possível processar o pagamento
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errorReason === "sdk"
              ? "O SDK do Mercado Pago não carregou (verifique a conexão ou bloqueios de rede)."
              : errorMessage
                ? errorMessage
                : "Ocorreu um erro ao processar o pagamento. Tente novamente em instantes."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-6 text-sm font-semibold text-white transition-colors hover:from-[#E84D13] hover:to-[#FF7A45]"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
