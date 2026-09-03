"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";

// Chave pública da conta Mercado Pago, usada por AMBOS os planos (Básico
// R$ 19,99 e Premium R$ 69,99). No Frontend NUNCA colocamos access token — só
// a public key. Configurada via env vars (Netlify); o Premium usa a mesma do
// Básico se não houver env var própria.
export const MP_PUBLIC_KEY_BASIC =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_BASIC ??
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ??
  "";

export const MP_PUBLIC_KEY_PREMIUM =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PREMIUM ?? MP_PUBLIC_KEY_BASIC;

export const MP_PUBLIC_KEY = MP_PUBLIC_KEY_BASIC;

export function publicKeyForPlan(plan: string): string {
  return plan === "premium" ? MP_PUBLIC_KEY_PREMIUM : MP_PUBLIC_KEY_BASIC;
}

// initMercadoPago é idempotente por chave: guardamos o conjunto das chaves já
// inicializadas para que trocar de plano não reinicialize/limpe o SDK à toa.
const sdkInitializedKeys = new Set<string>();

export function ensureMpSdkInitialized(publicKey?: string) {
  const key = publicKey || MP_PUBLIC_KEY;
  if (!key || sdkInitializedKeys.has(key)) return;
  sdkInitializedKeys.add(key);
  initMercadoPago(key, { locale: "pt-BR" });
}
