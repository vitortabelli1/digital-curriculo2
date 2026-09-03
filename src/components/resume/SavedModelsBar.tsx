"use client";

import { useEffect, useState } from "react";
import type { ResumeData } from "@/lib/types";

export function SavedModelsBar({
  currentTemplateId,
  currentData,
  maxModels,
  isDownloading,
  error,
  onDownload,
  onSaved,
  autoSave = false,
  hideSaveButton = false,
}: {
  currentTemplateId: string;
  currentData: ResumeData;
  maxModels: number;
  isDownloading: boolean;
  error: string | null;
  onDownload: (data: ResumeData) => void;
  onSaved?: () => void;
  autoSave?: boolean;
  hideSaveButton?: boolean;
}) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedEdition, setSavedEdition] = useState<ResumeData | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (autoSave) setSavedIds([currentTemplateId]);
  }, [autoSave, currentTemplateId]);

  const atLimit = savedIds.length >= maxModels;
  const limitLabel = Number.isFinite(maxModels) ? `${savedIds.length}/${maxModels}` : `${savedIds.length}`;

  const handleSave = () => {
    let added = false;
    setSavedIds((prev) => {
      if (prev.includes(currentTemplateId) || prev.length >= maxModels) return prev;
      added = true;
      return [...prev, currentTemplateId];
    });
    setSavedEdition({ ...currentData });
    setFlash(added ? "Design e edições salvos!" : "Design já salvo — edições atualizadas!");
    onSaved?.();
  };

  const buildData = (templateId: string): ResumeData => ({
    ...(savedEdition ?? currentData),
    templateId,
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        {!hideSaveButton && (
          <button
            type="button"
            onClick={handleSave}
            disabled={atLimit}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#E84D13] px-6 text-sm font-semibold text-[#FF5A1F] transition-colors hover:bg-[#FFF7F2] disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-400 dark:border-[#FF5A1F] dark:text-[#FF5A1F] dark:hover:bg-[#111111]"
          >
            Salvar
          </button>
        )}
      </div>

      {savedIds.length === 0 ? (
        <button
          type="button"
          disabled
          className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-300 px-8 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600 sm:w-auto"
        >
          Salve um modelo para baixar
        </button>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {savedIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onDownload(buildData(id))}
              disabled={isDownloading}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] transition-all hover:-translate-y-0.5 hover:from-[#E84D13] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "Gerando PDF..." : "Baixar PDF"}
            </button>
          ))}
        </div>
      )}

      {flash && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{flash}</p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
