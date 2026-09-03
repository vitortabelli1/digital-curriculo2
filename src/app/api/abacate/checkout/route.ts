import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";

const ABACATE_API_KEY = process.env.ABACATE_API_KEY;
const ABACATE_PREMIUM_PRODUCT_ID = process.env.ABACATE_PREMIUM_PRODUCT_ID;
const ABACATE_BASIC_PRODUCT_ID = process.env.ABACATE_BASIC_PRODUCT_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const ABACATE_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

interface ProductConfig {
  productId?: string;
  returnParam: string;
}

const PRODUCTS: Record<"premium" | "resume", ProductConfig> = {
  premium: {
    productId: ABACATE_PREMIUM_PRODUCT_ID,
    returnParam: "premium-paid",
  },
  resume: {
    productId: ABACATE_BASIC_PRODUCT_ID,
    returnParam: "basic-paid",
  },
};

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const plan = searchParams.get("plan") === "premium" ? "premium" : "resume";
  const config = PRODUCTS[plan];

  if (!ABACATE_API_KEY || !config.productId) {
    return NextResponse.json(
      { error: "Chave de API ou ID do produto do Abacate Pay não configurados." },
      { status: 501 }
    );
  }

  try {
    const res = await undiciFetch("https://api.abacatepay.com/v2/checkouts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ABACATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            id: config.productId,
            quantity: 1,
          },
        ],
        methods: ["PIX"],
        completionUrl: `${NEXT_PUBLIC_APP_URL}/?${config.returnParam}=1`,
      }),
      dispatcher: ABACATE_AGENT,
    });

    const body = (await res.json()) as {
      data?: { id?: string; url?: string; status?: string };
      error?: string | null;
    };

    if (!res.ok || !body.data || !body.data.url) {
      console.error("Erro Abacate Pay (create):", res.status, JSON.stringify(body));
      return NextResponse.json(
        { error: "Não foi possível gerar o checkout do pagamento." },
        { status: 502 }
      );
    }

    return NextResponse.json({ id: body.data.id, url: body.data.url });
  } catch (error) {
    console.error("Erro ao criar checkout Abacate Pay:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o checkout do pagamento." },
      { status: 500 }
    );
  }
}
