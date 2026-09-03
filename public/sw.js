/* Service Worker do eCurrículo Digital
 *
 * Função: redirecionar as chamadas GET do Payment Brick à API do Mercado Pago
 * (https://api.mercadopago.com/* — busca de BIN, payment methods, widgets,
 * identification types etc.) pelo servidor (/api/mercadopago/proxy), porque
 * nesta rede corporativa a API responde 403/conteúdo adulterado quando chamada
 * diretamente pelo navegador (chave pública), mas funciona com o access token
 * no servidor.
 *
 * O front também intercepta essas chamadas via fetch/XMLHttpRequest
 * (src/lib/mp-api-proxy.ts) para cobrir o intervalo antes de o SW assumir o
 * controle da página. Aqui é a camada extra para quando o SW já está ativo.
 *
 * Todo o restante do tráfego passa direto, sem cache.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const ORIGIN_PREFIX = "/api/mp/origin/";

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Nossos próprios pedidos de proxy: deixar passar (vão para o servidor).
  if (url.origin === self.location.origin && url.pathname.startsWith(ORIGIN_PREFIX)) {
    return;
  }

  // A API de dados (BIN, payment methods, etc.) segue pelo proxy do servidor,
  // que usa o access token. Os hosts de assets (sdk.mercadopago.com,
  // secure-fields.mercadopago.com, etc.) NÃO são reescritos: o Secure Fields
  // exige a origem real de secure-fields.mercadopago.com, caso contrário o
  // postMessage quebra com "The integration with Secure Fields failed".
  if (url.hostname === "api.mercadopago.com") {
    const path = encodeURIComponent(url.pathname);
    const params = url.searchParams.toString();
    const target = `/api/mercadopago/proxy?path=${path}&${params}`;
    event.respondWith(
      fetch(target, {
        headers: { Accept: "application/json" },
      }).then((res) => {
        const headers = new Headers(res.headers);
        headers.set("Content-Type", "application/json");
        return new Response(res.body, { status: res.status, headers });
      })
    );
    return;
  }
});
