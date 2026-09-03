import type { PlanId } from "@/lib/plans";

// Credencial única do Mercado Pago (server-side), usada por AMBOS os planos
// (Básico R$ 19,99 e Premium R$ 69,99). O access token nunca é enviado ao navegador.
// Os valores são configurados via variáveis de ambiente (Netlify). Se o plano
// Premium não tiver env var própria, usa a mesma conta do Básico.
export const MP_ACCESS_TOKEN_BASIC =
  process.env.MERCADOPAGO_ACCESS_TOKEN_BASIC ??
  process.env.MERCADOPAGO_ACCESS_TOKEN ??
  "";
export const MP_ACCESS_TOKEN_PREMIUM =
  process.env.MERCADOPAGO_ACCESS_TOKEN_PREMIUM ?? MP_ACCESS_TOKEN_BASIC;

export const MP_PUBLIC_KEY_BASIC =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_BASIC ??
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ??
  "";
export const MP_PUBLIC_KEY_PREMIUM =
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PREMIUM ?? MP_PUBLIC_KEY_BASIC;

export function accessTokenForPlan(plan: PlanId): string {
  return plan === "premium" ? MP_ACCESS_TOKEN_PREMIUM : MP_ACCESS_TOKEN_BASIC;
}

export function accessTokenForPublicKey(publicKey: string): string {
  if (!publicKey) return MP_ACCESS_TOKEN_BASIC;
  if (MP_PUBLIC_KEY_PREMIUM && publicKey === MP_PUBLIC_KEY_PREMIUM) {
    return MP_ACCESS_TOKEN_PREMIUM;
  }
  return MP_ACCESS_TOKEN_BASIC;
}
