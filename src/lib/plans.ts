export type PlanId = "resume" | "premium";

export interface PlanInfo {
  id: PlanId;
  name: string;
  amount: number;
  reference: string;
  description: string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  resume: {
    id: "resume",
    name: "Básico",
    amount: 19.99,
    reference: "curriculo-plus-basico",
    description: "eCurrículo Digital — Plano Básico",
  },
  premium: {
    id: "premium",
    name: "Premium",
    amount: 69.99,
    reference: "curriculo-plus-premium",
    description: "eCurrículo Digital — Plano Premium",
  },
};

export function getPlan(id: PlanId): PlanInfo {
  return PLANS[id];
}
