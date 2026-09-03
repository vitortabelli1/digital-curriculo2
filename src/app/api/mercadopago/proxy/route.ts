import { NextResponse } from "next/server";
import { Agent, fetch as undiciFetch } from "undici";
import { MP_PUBLIC_KEY_BASIC as PUBLIC_KEY } from "@/lib/mp-server";

// Ambiente corporativo com proxy que intercepta HTTPS (certificado próprio):
// usamos um agente que não valida a cadeia de certificados apenas para a Mercado Pago.
const MP_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

// Somente caminhos de LEITURA simples, sem ".." nem recursão. O Payment Brick
// consulta /v1/* (payment_methods/search, identification_types, ...) e também
// endpoints de inicialização do próprio Brick (/bricks/payment_brick/...).
const PATH_RE = /^\/[a-z0-9_\-/]+$/i;

/**
 * Proxy de leitura para a API pública da Mercado Pago (GET).
 *
 * O navegador chama esses endpoints com APENAS a public_key (sem access token)
 * — é assim que o SDK os autoriza. Nesta rede corporativa a chamada direta é
 * bloqueada/adulterada pelo proxy com inspeção de TLS, então repetimos aqui
 * pelo servidor, PRESERVANDO exatamente a autenticação original (public_key
 * apenas, sem header Authorization).
 *
 * Enviar o access token por aqui é ERRADO: o endpoint
 * /bricks/payment_brick/initialization passa a ser avaliado pelas políticas de
 * produto do token e devolve 403 "PA_UNAUTHORIZED_RESULT_FROM_POLICIES".
 *
 * A chamada chega como: /api/mercadopago/proxy?path=<caminho>&<params originais>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "";
  if (!PATH_RE.test(path) || path.includes("..")) {
    return NextResponse.json({ message: "Caminho inválido." }, { status: 400 });
  }

  // Repassa os parâmetros enviados pelo SDK (bin, processing_mode, limit, ...)
  // e garante a public_key. SEM header Authorization — o SDK chama com apenas
  // a public_key e adicionar o access token quebra a autorização ("At least
  // one policy returned UNAUTHORIZED").
  const params = new URLSearchParams(url.searchParams);
  params.delete("path");
  if (!params.has("public_key")) params.set("public_key", PUBLIC_KEY);

  // O valor reservado "product_id=bricks" (usado em algumas chamadas /v1/* do
  // Brick) é recusado com 403 quando o app não está habilitado para o produto
  // "Checkout Bricks". Sem ele a API responde 200 com TODOS os métodos de
  // pagamento — suficiente para o "creditCard: all" renderizar. O product_id
  // real do app (CHQ...) funciona normalmente e é preservado.
  if (params.get("product_id") === "bricks") {
    params.delete("product_id");
    console.warn(
      "Mercado Pago (proxy) — removendo product_id reservado 'bricks' (não autorizado)"
    );
  }

  try {
    const res = await undiciFetch(
      `https://api.mercadopago.com${path}?${params.toString()}`,
      {
        headers: {
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
      // não é JSON — provavelmente uma página de bloqueio. É isso que o
      // Brick interpreta como "malformed_card_bin_settings".
      console.error(
        "Mercado Pago (proxy) — resposta não-JSON da rede/proxy:",
        res.status,
        path,
        rawText.slice(0, 500)
      );
      return NextResponse.json(
        { message: "Resposta inválida da rede ao consultar o Mercado Pago." },
        { status: 502 }
      );
    }

    if (!res.ok) {
      console.error(
        "Mercado Pago (proxy) — erro da API:",
        res.status,
        path,
        params.toString(),
        JSON.stringify(body)
      );
    }
    return NextResponse.json(body as object, { status: res.status });
  } catch (error) {
    console.error("Mercado Pago (proxy) — falha de rede:", error);
    return NextResponse.json(
      { message: "Não foi possível consultar o Mercado Pago." },
      { status: 502 }
    );
  }
}