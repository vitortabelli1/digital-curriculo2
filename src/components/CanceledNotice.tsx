"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Notice() {
  const params = useSearchParams();
  if (params.get("canceled") !== "1") return null;
  return (
    <div className="mx-auto mb-8 flex max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      <span className="min-w-0">Pagamento cancelado. Quando estiver pronto, tente novamente.</span>
      <button
        type="button"
        onClick={() => {
          window.history.replaceState({}, "", "/");
        }}
        className="text-amber-600 hover:text-amber-800"
      >
        ×
      </button>
    </div>
  );
}

export function CanceledNotice() {
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}