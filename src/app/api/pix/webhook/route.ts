import { NextRequest, NextResponse } from "next/server";
import { markPixPaid } from "@/lib/pix-store";

// Webhook de confirmação de PIX manual.
//
// Sua instituição PIX (banco/gateway) deve ser configurada para chamar esta
// rota sempre que um pagamento for confirmado, enviando a `reference` (nosso
// txid embutido no QR Code) e o status. Formatos aceitos (flexível):
//   POST /api/pix/webhook  { "reference": "...", "status": "approved" }
//   POST /api/pix/webhook  { "ref": "...", "paid": true }
//   POST /api/pix/webhook  { "txid": "...", "external_reference": "..." }
// Para testar manualmente: GET /api/pix/webhook?reference=XXX&approved=1

const APPROVED = [
  "approved",
  "paid",
  "completed",
  "concluido",
  "concluded",
  "settled",
];

function extractReference(body: Record<string, unknown>, params: URLSearchParams): string | null {
  const candidates: unknown[] = [
    body.reference,
    body.ref,
    body.txid,
    body.external_reference,
    body.id,
    (body.data as Record<string, unknown> | undefined)?.reference,
    (body.transaction as Record<string, unknown> | undefined)?.reference,
    params.get("reference"),
    params.get("ref"),
    params.get("txid"),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function isApproved(body: Record<string, unknown>, params: URLSearchParams): boolean {
  const raw =
    body.status ??
    (body.payment as Record<string, unknown> | undefined)?.status ??
    params.get("status") ??
    "";
  const status = String(raw).toLowerCase();
  if (APPROVED.includes(status)) return true;
  if (body.paid === true) return true;
  if (params.get("approved") === "1" || params.get("approved") === "true") return true;
  if (!status) return true; // sem status explícito → confia na notificação
  return false;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const reference = extractReference(body, req.nextUrl.searchParams);
  if (!reference) {
    return NextResponse.json({ message: "reference ausente" }, { status: 400 });
  }

  const approved = isApproved(body, req.nextUrl.searchParams);
  if (approved) markPixPaid(reference);

  return NextResponse.json({ ok: true, paid: approved });
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("ref");
  if (!reference) {
    return NextResponse.json({ message: "reference ausente" }, { status: 400 });
  }

  const approved = isApproved({}, req.nextUrl.searchParams);
  if (approved) markPixPaid(reference);

  return NextResponse.json({ ok: true, paid: approved });
}
