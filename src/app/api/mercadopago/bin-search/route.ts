import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { MP_PUBLIC_KEY_BASIC, accessTokenForPublicKey } from "@/lib/mp-server";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a Mercado Pago.
const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

const PUBLIC_KEY = MP_PUBLIC_KEY_BASIC;

/**
 * Proxy do endpoint /v1/payment_methods/search usado pelo Payment Brick.
 *
 * No navegador, o SDK chama esse endpoint em duas situações:
 *  1. No init do Brick, para resolver o site_id — envia limit/public_key/
 *     product_id, SEM bin. Se não devolver site_id, o Brick falha com
 *     "Bricks component initialization failed" (load_site_id_failed).
 *  2. Em cada mudança de BIN do cartão — envia bin, processing_mode etc.
 *
 * Em algumas redes a chamada direta com só a chave pública retorna 403; aqui
 * repetimos a consulta com o access token (além da public_key) e devolvemos a
 * resposta COMPLETA (incluindo site_id) para não quebrar nem o init nem o BIN.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedPublicKey = url.searchParams.get("public_key") || PUBLIC_KEY;
  const ACCESS_TOKEN = accessTokenForPublicKey(requestedPublicKey);
  if (!ACCESS_TOKEN) {
    return NextResponse.json(
      { message: "Access token do Mercado Pago não configurado." },
      { status: 501 }
    );
  }

  const bin = url.searchParams.get("bin");
  const isSdkInit =
    !bin &&
    (url.searchParams.has("limit") ||
      url.searchParams.has("product_id") ||
      url.searchParams.has("public_key"));
  if (!bin && !isSdkInit) {
    return NextResponse.json({
      paging: { total: 0, limit: 0, offset: 0 },
      results: [],
    });
  }

  // Repassa os parâmetros enviados pelo SDK (bin, marketplace, status,
  // processing_mode, limit, product_id, ...) e garante a public_key.
  const params = new URLSearchParams();
  for (const key of [
    "bin",
    "marketplace",
    "status",
    "processing_mode",
    "limit",
    "offset",
    "product_id",
    "country",
    "site_id",
  ]) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  params.set("public_key", url.searchParams.get("public_key") || PUBLIC_KEY);

  try {
    const res = await undiciFetch(
      `https://api.mercadopago.com/v1/payment_methods/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        dispatcher: MP_AGENT,
      }
    );

    const rawText = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      // A rede corporativa (proxy com inspeção de TLS) devolveu algo que
      // não é JSON — provavelmente uma página de bloqueio. Isso é a causa
      // raiz mais comum do "malformed_card_bin_settings" no Brick: ele
      // espera { paging, results: [...] } e recebe outra coisa.
      console.error(
        "Mercado Pago (bin-search) — resposta não-JSON da rede/proxy:",
        res.status,
        rawText.slice(0, 500)
      );
      return NextResponse.json(
        { message: "Resposta inválida da rede ao consultar o Mercado Pago." },
        { status: 502 }
      );
    }

    if (!res.ok) {
      console.error("Mercado Pago (bin-search) — erro da API:", res.status, body);
    }
    return NextResponse.json(body as object, { status: res.status });
  } catch (error) {
    console.error("Mercado Pago (bin-search) — falha de rede:", error);
    return NextResponse.json(
      { message: "Não foi possível consultar o Mercado Pago." },
      { status: 502 }
    );
  }
}