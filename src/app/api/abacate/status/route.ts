import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";

const ABACATE_API_KEY = process.env.ABACATE_API_KEY;
const ABACATE_PREMIUM_BILL_ID = process.env.ABACATE_PREMIUM_BILL_ID;

const ABACATE_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

export async function GET(request: Request) {
  if (!ABACATE_API_KEY) {
    return NextResponse.json(
      { error: "Chave de API do Abacate Pay não configurada." },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || ABACATE_PREMIUM_BILL_ID;
  if (!id) {
    return NextResponse.json(
      { error: "ID da cobrança do Abacate Pay não configurado." },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.abacatepay.com/v2/checkouts/get?id=${encodeURIComponent(
      id
    )}`;
    const res = await undiciFetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${ABACATE_API_KEY}` },
      dispatcher: ABACATE_AGENT,
    });

    const body = (await res.json()) as {
      data?: { status?: string; id?: string };
      error?: string | null;
    };

    if (!res.ok || !body.data) {
      console.error("Erro Abacate Pay (status):", res.status, JSON.stringify(body));
      return NextResponse.json(
        { error: "Não foi possível consultar o status do pagamento." },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: body.data.status });
  } catch (error) {
    console.error("Erro ao consultar status Abacate Pay:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o status do pagamento." },
      { status: 500 }
    );
  }
}
