import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { PLANS, type PlanId } from "@/lib/plans";
import { accessTokenForPlan } from "@/lib/mp-server";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a Mercado Pago.
const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

// Valor e identificação do plano definidos SOMENTE no servidor.
// O valor enviado pelo cliente (tela do brick) é ignorado, impedindo
// que alguém altere o preço na requisição e pague menos.

interface MPFormData {
  token?: string;
  payment_method_id?: string;
  issuer_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: { type?: string; number?: string };
  };
}

export async function POST(request: Request) {
  let payload: { formData: MPFormData; plan?: string };
  try {
    payload = (await request.json()) as { formData: MPFormData; plan?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { formData } = payload;

  // Preço e referência definidos SOMENTE no servidor, a partir do plano
  // selecionado. O valor enviado pelo cliente é ignorado (anti-fraude).
  const plan = (payload.plan as PlanId) in PLANS ? (payload.plan as PlanId) : "resume";
  const ACCESS_TOKEN = accessTokenForPlan(plan);
  const PLAN_AMOUNT = PLANS[plan].amount;
  const PLAN_REFERENCE = PLANS[plan].reference;
  const PLAN_DESCRIPTION = PLANS[plan].description;

  if (!ACCESS_TOKEN) {
    // Diagnóstico: ajuda a identificar qual env var está presente na Vercel.
    console.error("Mercado Pago /pay — access token ausente.", {
      plan,
      hasBasic: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN_BASIC),
      hasGeneric: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
      hasPremium: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN_PREMIUM),
    });
    return NextResponse.json(
      { error: `Access token do Mercado Pago do plano ${plan} não configurado.` },
      { status: 501 }
    );
  }

  const isPix = formData?.payment_method_id === "pix";

  // Cartão precisa do token gerado pelo Brick; Pix não usa token.
  if (!formData || !formData.payment_method_id || (!isPix && !formData.token)) {
    console.error("Mercado Pago (pay) — payload incompleto:", {
      hasToken: Boolean(formData?.token),
      paymentMethodId: formData?.payment_method_id,
      formDataKeys: Object.keys(formData ?? {}),
    });
    return NextResponse.json(
      { error: "Dados de pagamento incompletos." },
      { status: 400 }
    );
  }

  const idempotencyKey =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // notification_url é OPCIONAL e a API rejeita o pagamento se ela não for
  // publicamente acessível ("notification_url attribute must be url valid")
  // — ex.: http://localhost. Em teste local enviamos SEM webhook; o status é
  // acompanhado por polling (/api/mercadopago/status/:id). Em produção
  // (URL https pública) o webhook é enviado normalmente.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  let notificationUrl: string | undefined;
  try {
    const parsed = new URL(appUrl);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "0.0.0.0";
    if (
      !isLocalHost &&
      (parsed.protocol === "http:" || parsed.protocol === "https:")
    ) {
      notificationUrl = `${appUrl.replace(/\/+$/, "")}/api/webhooks/mercadopago`;
    }
  } catch {
    // URL inválida — segue sem webhook.
  }

  try {
    const res = await undiciFetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: PLAN_AMOUNT,
        payment_method_id: formData.payment_method_id,
        description: PLAN_DESCRIPTION,
        external_reference: PLAN_REFERENCE,
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        // binary_mode só se aplica a cartão (aprovação imediata). PIX, boleto e
        // transferência são assíncronos e permanecem em "pending" até a confirmação.
        binary_mode: Boolean(formData?.token),
        // Campos exclusivos de cartão — omitidos no Pix:
        ...(isPix
          ? {}
          : {
              token: formData.token,
              installments: Number(formData.installments ?? 1),
              issuer_id: formData.issuer_id ? Number(formData.issuer_id) : undefined,
            }),
        payer: {
          email: formData.payer?.email,
          first_name: formData.payer?.first_name,
          last_name: formData.payer?.last_name,
          identification: formData.payer?.identification,
        },
      }),
      dispatcher: MP_AGENT,
    });

    const body = (await res.json()) as {
      id?: number;
      status?: string;
      status_detail?: string;
      message?: string;
      transaction_amount?: number;
      currency_id?: string;
    };

    if (!res.ok) {
      console.error("Erro Mercado Pago (pay):", res.status, JSON.stringify(body));
      return NextResponse.json(
        { error: body.message ?? "Pagamento recusado pela Mercado Pago." },
        { status: 502 }
      );
    }

    // Conferência do valor cobrado: garante que o pagamento aprovado
    // foi exatamente pelo preço do plano, em reais (BRL).
    if (body.status === "approved") {
      const charged = Number(body.transaction_amount);
      const amountOk = Number.isFinite(charged) && Math.abs(charged - PLAN_AMOUNT) < 0.005;
      const currencyOk = body.currency_id === "BRL";
      if (!amountOk || !currencyOk) {
        console.error(
          "Mercado Pago (pay) — valor cobrado não confere com o plano:",
          JSON.stringify(body)
        );
        return NextResponse.json(
          {
            error: "Valor cobrado não confere com o plano contratado. " +
              "Pagamento será estornado pela Mercado Pago.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      id: body.id,
      status: body.status,
      statusDetail: body.status_detail,
    });
  } catch (error) {
    console.error("Erro ao criar pagamento Mercado Pago:", error);
    return NextResponse.json(
      { error: "Não foi possível processar o pagamento." },
      { status: 500 }
    );
  }
}