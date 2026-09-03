"use client";

import { useRef } from "react";
import { useResume } from "@/lib/resume-context";
import { TEMPLATES, type TemplateConfig } from "@/lib/templates";

function MiniMock({ t }: { t: TemplateConfig }) {
  const p = t.palette;
  return (
    <div
      className="aspect-[210/297] w-full overflow-hidden rounded-md"
      style={{ backgroundColor: p.paper }}
    >
      {t.layout === "sidebar" ? (
        <div className="flex h-full">
          <div className="w-[32%] p-[6%]" style={{ backgroundColor: p.headerBg }}>
            <div className="h-[8%] w-full rounded-sm" style={{ backgroundColor: p.headerText }} />
            <div
              className="mt-[4%] h-[3%] w-[70%] rounded-sm"
              style={{ backgroundColor: p.headerAccent }}
            />
            <div className="mt-[16%] space-y-[5%]">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[3%] w-full rounded-sm"
                  style={{ backgroundColor: p.headerAccent, opacity: 0.7 }}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-[6%] p-[6%]">
            <div className="h-[4%] w-[55%] rounded-sm" style={{ backgroundColor: p.accent }} />
            <div className="space-y-[4%]">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-[3%] w-full rounded-sm"
                  style={{ backgroundColor: p.muted, opacity: 0.5 }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="h-[30%] p-[7%]" style={{ backgroundColor: p.headerBg }}>
            <div className="h-[10%] w-[60%] rounded-sm" style={{ backgroundColor: p.headerText }} />
            <div
              className="mt-[5%] h-[4%] w-[45%] rounded-sm"
              style={{ backgroundColor: p.headerAccent }}
            />
            <div className="mt-[10%] h-[3%] w-[85%] rounded-sm" style={{ backgroundColor: p.headerAccent, opacity: 0.6 }} />
          </div>
          <div className="flex-1 space-y-[6%] p-[7%]">
            <div className="h-[4%] w-[50%] rounded-sm" style={{ backgroundColor: p.accent }} />
            <div className="space-y-[4%]">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[3%] w-full rounded-sm"
                  style={{ backgroundColor: p.muted, opacity: 0.5 }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  t,
  selected,
  onSelect,
}: {
  t: TemplateConfig;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      aria-pressed={selected}
      title={t.description}
      className={`group w-[110px] shrink-0 cursor-pointer snap-start rounded-xl p-1.5 text-left transition-all sm:w-[150px] ${
        selected
          ? "bg-gradient-to-br from-[#111111] to-[#111111] ring-2 ring-[#FF5A1F] ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950"
          : "hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
      }`}
    >
      <MiniMock t={t} />
      <span
        className={`mt-1.5 block truncate text-center text-[11px] font-semibold ${
          selected ? "text-white" : "text-zinc-600 dark:text-zinc-300"
        }`}
      >
        {t.name}
      </span>
    </button>
  );
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Modelos anteriores" : "Próximos modelos"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {direction === "prev" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

const ROW_SIZE = TEMPLATES.length / 2;

export function TemplatePicker({
  showHeader = true,
  onSelect,
}: {
  showHeader?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { data, update } = useResume();
  const rowARef = useRef<HTMLDivElement>(null);
  const rowBRef = useRef<HTMLDivElement>(null);

  const scrollRows = (dir: 1 | -1) => {
    for (const ref of [rowARef, rowBRef]) {
      const el = ref.current;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
    }
  };

  const handleSelect = (id: string) => {
    update("templateId", id);
    onSelect?.(id);
  };

  const rows = [TEMPLATES.slice(0, ROW_SIZE), TEMPLATES.slice(ROW_SIZE)];

  return (
    <div className="mx-auto mb-8 w-full max-w-3xl">
      <div className="mb-4 flex justify-end">
        <div className="flex gap-2">
          <ArrowButton direction="prev" onClick={() => scrollRows(-1)} />
          <ArrowButton direction="next" onClick={() => scrollRows(1)} />
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            ref={rowIndex === 0 ? rowARef : rowBRef}
            className="flex gap-3 overflow-x-auto pb-2 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {row.map((t) => (
              <TemplateCard
                key={t.id}
                t={t}
                selected={data.templateId === t.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
