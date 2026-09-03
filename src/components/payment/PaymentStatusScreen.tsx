"use client";

import { useEffect } from "react";
import { StatusScreen } from "@mercadopago/sdk-react";
import { ensureMpSdkInitialized } from "@/lib/mp-init";

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

/**
 * Status Screen Brick oficial do Mercado Pago: dado um paymentId, mostra
 * sozinho o status do pagamento — incluindo, no caso de PIX pendente, o QR
 * Code e o código copia-e-cola prontos, sem precisarmos gerar nada na mão.
 */
export function PaymentStatusScreen({
  paymentId,
  publicKey,
  planId = "resume",
  onStatusChange,
  onError,
}: {
  paymentId: number;
  publicKey: string;
  planId?: string;
  onStatusChange: (status: string) => void;
  onError: (message?: string) => void;
}) {
  useEffect(() => {
    ensureMpSdkInitialized(publicKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      onError("Chave pública do Mercado Pago não configurada.");
    }
  }, [publicKey, onError]);

  if (!publicKey) return null;

  // O Status Screen Brick não expõe um callback nativo de mudança de status
  // em todas as versões do SDK, então usamos o polling da nossa API (que já
  // tem o atalho de webhook) só para sabermos quando redirecionar o usuário
  // após a aprovação — a UI (QR Code, copia-e-cola, ícones) continua 100% do
  // Brick oficial.
  usePollStatusForRedirect(paymentId, planId, onStatusChange);

  return (
    <StatusScreen
      locale="pt-BR"
      initialization={{ paymentId: String(paymentId) }}
      customization={{ visual: { hidePixQrCode: false } }}
      onError={(error: unknown) => {
        console.error("Status Screen Brick error:", error);
        onError(errorMessage(error));
      }}
      onReady={() => {}}
    />
  );
}

function usePollStatusForRedirect(
  paymentId: number,
  planId: string,
  onStatusChange: (status: string) => void
) {
  useEffect(() => {
    let alive = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/mercadopago/status/${paymentId}?plan=${encodeURIComponent(planId)}`
        );
        const json = (await res.json()) as { status?: string };
        if (!alive || !json.status) return;
        if (json.status === "approved" || json.status === "rejected" || json.status === "cancelled") {
          onStatusChange(json.status);
        }
      } catch {
        // tenta de novo no próximo ciclo
      }
    }, 3000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);
}
