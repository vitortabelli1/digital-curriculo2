"use client";

import type { ResumeData } from "./types";

const STORAGE_KEY = "curriculoia-resume-data";
const PLAN_KEY = "curriculoia-selected-plan";

export function saveResumeData(data: ResumeData) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage indisponível (privacidade/SSR) — ignora
  }
}

export function loadResumeData(): ResumeData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResumeData) : null;
  } catch {
    return null;
  }
}

export function clearResumeData() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

export function saveSelectedPlan(plan: string) {
  try {
    localStorage.setItem(PLAN_KEY, plan);
  } catch {
    // ignora
  }
}

export function loadSelectedPlan(): string | null {
  try {
    return localStorage.getItem(PLAN_KEY);
  } catch {
    return null;
  }
}

const PREMIUM_CHECKOUT_KEY = "curriculoia-premium-checkout";

export type StoredPremiumCheckout = { id: string; url: string; createdAt: number };

// Um checkout pendente criado há mais de 20 minutos é considerado expirado
// (o PIX tem validade padrão de 30 min). Reutilizamos checkouts recentes para
// que o polling consulte o MESMO checkout do pagamento, mas descartamos os
// antigos para não ficar preso monitorando um checkout que nunca será pago.
const PREMIUM_CHECKOUT_MAX_AGE_MS = 20 * 60 * 1000;

export function savePremiumCheckout(checkout: { id: string; url: string }) {
  try {
    const stored: StoredPremiumCheckout = {
      ...checkout,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(PREMIUM_CHECKOUT_KEY, JSON.stringify(stored));
  } catch {
    // ignora
  }
}

export function loadPremiumCheckout(): StoredPremiumCheckout | null {
  try {
    const raw = sessionStorage.getItem(PREMIUM_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPremiumCheckout;
    if (!parsed.id || !parsed.url) return null;
    if (Date.now() - parsed.createdAt > PREMIUM_CHECKOUT_MAX_AGE_MS) {
      sessionStorage.removeItem(PREMIUM_CHECKOUT_KEY);
      return null;
    }
    return { id: parsed.id, url: parsed.url, createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function clearPremiumCheckout() {
  try {
    sessionStorage.removeItem(PREMIUM_CHECKOUT_KEY);
  } catch {
    // ignora
  }
}