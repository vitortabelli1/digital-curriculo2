import { NextRequest, NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";

// Permite apenas origens do Mercado Pago / Mercado Livre (evita SSRF).
function isAllowedHost(host: string): boolean {
  return (
    host === "api.mercadopago.com" ||
    host.endsWith(".mercadopago.com") ||
    host.endsWith(".mlstatic.com")
  );
}

const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

// Proxy de origem: serve qualquer recurso estático do Mercado Pago a partir do
// nosso próprio domínio. A SDK é carregada de
// `/api/mp/origin/sdk.mercadopago.com/js/v2`, e seus chunks (que resolvem
// relativamente à URL do script) continuam caindo em `/api/mp/origin/...`,
// então o navegador NUNCA fala direto com sdk.mercadopago.com — contorna
// bloqueios de rede corporativa/proxy que derrubavam o SDK.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ rest: string[] }> }
) {
  const { rest } = await params;
  if (!rest || rest.length < 2) {
    return NextResponse.json({ message: "Requisição inválida." }, { status: 400 });
  }

  const host = rest[0];
  if (!isAllowedHost(host)) {
    return NextResponse.json({ message: "Host não permitido." }, { status: 403 });
  }

  const path = "/" + rest.slice(1).join("/");
  const target = `https://${host}${path}${req.nextUrl.search}`;

  try {
    const res = await undiciFetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; eCurriculoDigital/1.0)",
        Accept: "*/*",
        Referer: "https://www.mercadopago.com/",
      },
      dispatcher: MP_AGENT,
    });

    const body = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("mp origin proxy error:", target, err);
    return NextResponse.json(
      { message: "Falha ao buscar recurso do Mercado Pago." },
      { status: 502 }
    );
  }
}
