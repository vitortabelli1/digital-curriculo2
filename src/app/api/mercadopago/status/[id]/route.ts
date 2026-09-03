import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { getPaymentStatus } from "@/lib/payment-status-cache";
import { accessTokenForPlan } from "@/lib/mp-server";
import type { PlanId } from "@/lib/plans";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a Mercado Pago.
const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

// Usado pelo front para dar polling no status de um pagamento (ex.: PIX
// aguardando confirmação) enquanto o webhook não chega ou como fallback caso
// o webhook não esteja configurado no ambiente.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Id do pagamento ausente." }, { status: 400 });
  }

  // O pagamento pertence à conta do plano que o criou; consultamos com o
  // access token da mesma conta.
  const plan =
    (new URL(request.url).searchParams.get("plan") as PlanId | null) ?? "resume";
  const ACCESS_TOKEN = accessTokenForPlan(plan);
  if (!ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Access token do Mercado Pago não configurado." },
      { status: 501 }
    );
  }

  // Atalho: se o webhook já entregou o status, responde na hora sem
  // precisar consultar a API do Mercado Pago de novo.
  const cached = getPaymentStatus(id);
  if (cached) {
    return NextResponse.json({ status: cached.status, statusDetail: cached.statusDetail });
  }

  try {
    const res = await undiciFetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      dispatcher: MP_AGENT,
    });

    const body = (await res.json()) as {
      status?: string;
      status_detail?: string;
      transaction_amount?: number;
      currency_id?: string;
    };

    if (!res.ok) {
      console.error("Erro Mercado Pago (status):", res.status, JSON.stringify(body));
      return NextResponse.json(
        { error: "Não foi possível consultar o status do pagamento." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: body.status,
      statusDetail: body.status_detail,
    });
  } catch (error) {
    console.error("Erro ao consultar status Mercado Pago:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o status do pagamento." },
      { status: 500 }
    );
  }
}
