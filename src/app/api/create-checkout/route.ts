import { NextResponse } from "next/server";
import Stripe from "stripe";

const PRODUCTS: Record<
  string,
  { name: string; description: string; price: number; successPath: string }
> = {
  resume: {
    name: "Download do Currículo PDF",
    description:
      "Currículo profissional formatado em PDF, gerado com seus dados.",
    price: 1999,
    successPath: "/success",
  },
  "resume-premium": {
    name: "Currículo + Correção por IA",
    description:
      "Currículo em PDF + revisão profissional do conteúdo escrita por IA.",
    price: 2499,
    successPath: "/success",
  },
  "cover-letter": {
    name: "Carta de Apresentação",
    description:
      "Carta de apresentação personalizada, escrita por IA com base no seu perfil.",
    price: 990,
    successPath: "/cover-letter",
  },
};

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe não configurado. Adicione STRIPE_SECRET_KEY ao .env.local" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let productKey = "resume";
  try {
    const body = await request.json();
    if (body?.product && PRODUCTS[body.product]) {
      productKey = body.product;
    }
  } catch {
    // corpo vazio/ausente → produto padrão
  }

  const product = PRODUCTS[productKey];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
        },
      ],
      success_url: `${appUrl}${product.successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/success?session_id=__canceled__`,
      metadata: { product: productKey },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    return NextResponse.json(
      { error: "Não foi possível iniciar o pagamento. Tente novamente." },
      { status: 500 }
    );
  }
}