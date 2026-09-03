import { NextResponse } from "next/server";
import { verifyAbacateSignature } from "@/lib/abacate-signature";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signatureHeader =
    request.headers.get("x-webhook-signature") || request.headers.get("x-abacate-signature") || "";

  if (!signatureHeader) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  // O header pode vir no formato antigo (base64 puro) ou no novo (t=...,v1=...)
  let signature = signatureHeader;
  const v1 = signatureHeader.match(/v1=([^,]+)/);
  if (v1) signature = v1[1];

  if (!verifyAbacateSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let payload: { event?: string; data?: { billing?: { id?: string; status?: string } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const event = payload.event;
  const billingId = payload.data?.billing?.id;
  const billingStatus = payload.data?.billing?.status;

  const confirmed =
    event === "checkout.completed" ||
    event === "subscription.completed" ||
    event === "subscription.renewed" ||
    billingStatus === "PAID";

  if (!confirmed) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // O front consulta /api/abacate/status a cada 5s, que já reflete
  // automaticamente o pagamento confirmado via API. O webhook serve como
  // confirmação imediata e validação de segurança.
  console.log(`Abacate Pay webhook recebido: ${event} (billing ${billingId || "?"})`);

  return NextResponse.json({ received: true }, { status: 200 });
}
