import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { setPaymentStatus } from "@/lib/payment-status-cache";
import { MP_ACCESS_TOKEN_BASIC as ACCESS_TOKEN } from "@/lib/mp-server";

const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

// Configure esta URL (https://SEU_DOMINIO/api/webhooks/mercadopago) nas
// notificações do app no painel do Mercado Pago para receber confirmação
// instantânea de pagamento (cartão e PIX), em vez de depender só do polling.
async function fetchPaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url);

  // Formato novo: ?type=payment&data.id=123 (ou body JSON { type, data: { id } })
  const typeParam = url.searchParams.get("type");
  const dataIdParam = url.searchParams.get("data.id");
  if (typeParam === "payment" && dataIdParam) return dataIdParam;

  // Formato legado (IPN): ?topic=payment&id=123
  const topic = url.searchParams.get("topic");
  const legacyId = url.searchParams.get("id");
  if (topic === "payment" && legacyId) return legacyId;

  try {
    const body = (await request.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };
    if ((body.type === "payment" || body.action?.startsWith("payment.")) && body.data?.id) {
      return String(body.data.id);
    }
  } catch {
    // corpo vazio/não-JSON — segue com o que veio pela query string
  }

  return null;
}

export async function POST(request: Request) {
  const paymentId = await fetchPaymentId(request);

  // Sempre responde 200 rápido: o Mercado Pago reenvia a notificação se
  // não receber sucesso, então evitamos qualquer trabalho pesado aqui.
  if (!paymentId || !ACCESS_TOKEN) {
    return NextResponse.json({ received: true });
  }

  try {
    const res = await undiciFetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      dispatcher: MP_AGENT,
    });
    const body = (await res.json()) as { status?: string; status_detail?: string };
    if (res.ok && body.status) {
      setPaymentStatus(paymentId, body.status, body.status_detail);
    }
  } catch (error) {
    console.error("Erro ao processar webhook Mercado Pago:", error);
  }

  return NextResponse.json({ received: true });
}

// O Mercado Pago também pode enviar a notificação por GET em alguns casos.
export async function GET(request: Request) {
  return POST(request);
}
