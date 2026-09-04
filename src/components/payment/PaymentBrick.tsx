"use client";

import { useEffect } from "react";
import { Payment } from "@mercadopago/sdk-react";
import type { IPaymentBrickPaymentMethods } from "@mercadopago/sdk-react/esm/bricks/payment/type";
import { installMpApiProxy } from "@/lib/mp-api-proxy";
import { ensureMpSdkInitialized, publicKeyForPlan } from "@/lib/mp-init";

type AllOrArray = "all" | string[];
type BrickMethods = IPaymentBrickPaymentMethods & {
  creditCard: AllOrArray;
  debitCard: AllOrArray;
  ticket: AllOrArray;
  bankTransfer: AllOrArray;
  atm: AllOrArray;
  mercadoPago: AllOrArray;
  prepaidCard: AllOrArray;
};

// "" desativa o método; "all" habilita. O tipo do SDK aceita string[] vazio.
const METHOD_BASE: BrickMethods = {
  creditCard: [],
  debitCard: [],
  ticket: [],
  bankTransfer: [],
  atm: [],
  mercadoPago: [],
  prepaidCard: [],
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const raw = error as {
      message?: string;
      cause?: { message?: string };
      error?: string;
    };
    return raw?.message || raw?.cause?.message || raw?.error || JSON.stringify(error);
  }
  return String(error);
}

interface SubmitFormData {
  token?: string;
  payment_method_id?: string;
  issuer_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
}

export function PaymentBrick({
  amount,
  payerEmail,
  planId,
  onCreated,
  onError,
  paymentMethods,
}: {
  amount: number;
  payerEmail?: string;
  planId: string;
  onCreated: (result: { paymentId: number; status: string }) => void;
  onError: (reason: "sdk" | "brick", message?: string) => void;
  paymentMethods?: Partial<BrickMethods>;
}) {
  const publicKey = publicKeyForPlan(planId);

  useEffect(() => {
    // Garante que as chamadas do SDK à API do Mercado Pago passem pelo proxy
    // do servidor (idempotente; independe do Service Worker).
    installMpApiProxy();
    ensureMpSdkInitialized(publicKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      onError("sdk", "Chave pública do Mercado Pago não configurada.");
    }
  }, [publicKey, onError]);

  if (!publicKey) return null;

  const handleSubmit = async ({ formData }: { formData: SubmitFormData }) => {
    let res: Response;
    try {
      res = await fetch("/api/mercadopago/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, plan: planId }),
      });
    } catch (err) {
      // Falha de rede/TLS ao falar com nosso próprio servidor. Não rejeitamos a
      // Promise (isso trava o Brick); apenas reportamos o erro ao usuário.
      console.error("Erro de rede ao chamar /api/mercadopago/pay:", err);
      onError("brick", "Não foi possível conectar ao servidor de pagamento. Tente novamente.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as {
      id?: number;
      status?: string;
      error?: string;
    };
    if (!res.ok || !json.id || !json.status) {
      // IMPORTANTE: retornar (e NÃO lançar) aqui. Lançar dentro do onSubmit faz
      // o Brick ficar preso no estado de carregamento (botão trava). O SDK
      // exibe o erro por conta própria quando a Promise resolve.
      const msg = json?.error ?? `Falha ao criar o pagamento (HTTP ${res.status}).`;
      console.error("Mercado Pago /pay retornou erro:", res.status, json);
      onError("brick", msg);
      return;
    }
    onCreated({ paymentId: json.id, status: json.status });
  };

  return (
    <Payment
      locale="pt-BR"
      initialization={{
        amount,
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
      }}
      customization={{
        paymentMethods: {
          ...METHOD_BASE,
          ...(paymentMethods ?? { creditCard: "all", debitCard: "all" }),
        },
      }}
      onSubmit={handleSubmit}
      onError={(error: unknown) => {
        console.error("Payment Brick error:", errorMessage(error), error);
        onError("brick", errorMessage(error));
      }}
      onReady={() => {}}
    />
  );
}
