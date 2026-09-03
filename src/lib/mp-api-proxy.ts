"use client";

/**
 * Intercepta no navegador as chamadas GET do Payment Brick à API da Mercado
 * Pago (https://api.mercadopago.com/* — v1/payment_methods/search, widgets,
 * etid etc.) e as redireciona para o proxy do servidor
 * (/api/mercadopago/proxy), que consulta com o access token.
 *
 * Por quê: nesta rede corporativa o navegador não consegue falar com
 * api.mercadopago.com (proxy com inspeção de TLS / 403) e o Brick quebra no
 * init com "malformed_card_bin_settings". O Service Worker já faz esse
 * redirecionamento, mas somente depois que assume o controle da página — na
 * 1ª visita (ou após atualização do SW) o SDK tenta falar direto e falha.
 * Este patch cobre esse intervalo e funciona em qualquer momento.
 *
 * Cobre fetch e XMLHttpRequest porque o SDK pode usar qualquer um dos dois.
 * Só afeta GET; todo o resto do tráfego passa intacto.
 */
let installed = false;

function isMpApiUrl(url: URL): boolean {
  return url.hostname === "api.mercadopago.com";
}

// Hosts de assets estáticos do Mercado Pago (SDK, secure-fields, estáticos).
// NÃO são reescritos: o Secure Fields (iframe de cartão) exige que carregue de
// secure-fields.mercadopago.com com a origem real, senão o canal de postMessage
// quebra com "The integration with Secure Fields failed". Mantemos o carregamento
// direto; só a API (api.mercadopago.com) segue pelo proxy do servidor.
const MP_ASSET_HOSTS: string[] = [];

function isMpAssetUrl(url: URL): boolean {
  return MP_ASSET_HOSTS.includes(url.hostname);
}

function toProxyUrl(url: URL): string {
  const params = url.searchParams.toString();
  const path = encodeURIComponent(url.pathname);
  return `/api/mercadopago/proxy?path=${path}&${params}`;
}

export function installMpApiProxy(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let parsed: URL | null = null;
    try {
      parsed = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      );
    } catch {
      parsed = null;
    }
    if (parsed && isMpApiUrl(parsed)) {
      const headers = new Headers(init?.headers);
      headers.set("Accept", "application/json");
      return originalFetch(toProxyUrl(parsed), { ...init, headers });
    }
    if (parsed && isMpAssetUrl(parsed)) {
      return originalFetch(parsed.href, init);
    }
    return originalFetch(input, init);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    try {
      const parsed = new URL(String(url));
      if (method.toUpperCase() === "GET" && isMpApiUrl(parsed)) {
        url = toProxyUrl(parsed);
      } else if (method.toUpperCase() === "GET" && isMpAssetUrl(parsed)) {
        url = parsed.href;
      }
    } catch {
      // URL relativa — não é a API da Mercado Pago, segue normal.
    }
    return originalOpen.call(this, method, url, async ?? true, username, password);
  };
}