"use client";

import { useResume } from "@/lib/resume-context";
import { Field, TextArea } from "@/components/ui/Field";

function ExperienceCard({
  id,
  index,
  onRemove,
}: {
  id: string;
  index: number;
  onRemove: () => void;
}) {
  const { data, updateExperience } = useResume();
  const exp = data.experiences.find((e) => e.id === id);

  if (!exp) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Experiência {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs font-medium text-red-500 hover:text-red-600"
        >
          Remover
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Cargo"
          placeholder="Analista de Marketing"
          value={exp.role}
          onChange={(e) => updateExperience(id, "role", e.target.value)}
        />
        <Field
          label="Empresa"
          placeholder="Empresa XYZ"
          value={exp.company}
          onChange={(e) => updateExperience(id, "company", e.target.value)}
        />
        <Field
          label="Período"
          placeholder="Jan 2022 – Atual"
          value={exp.period}
          onChange={(e) => updateExperience(id, "period", e.target.value)}
        />
      </div>
      <TextArea
        label="Descrição"
        rows={3}
        placeholder="Principais responsabilidades e conquistas..."
        value={exp.description}
        onChange={(e) => updateExperience(id, "description", e.target.value)}
      />
    </div>
  );
}

export function StepExperience() {
  const { data, addExperience, removeExperience } = useResume();

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Adicione suas experiências profissionais — a mais recente primeiro.
      </p>
      {data.experiences.map((exp, i) => (
        <ExperienceCard
          key={exp.id}
          id={exp.id}
          index={i}
          onRemove={() => removeExperience(exp.id)}
        />
      ))}
      <button
        type="button"
        onClick={addExperience}
        className="w-full rounded-2xl border-2 border-dashed border-zinc-300 py-3.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-[#FF5A1F] hover:text-[#FF5A1F] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-[#FF5A1F] dark:hover:text-[#FF5A1F]"
      >
        + Adicionar experiência
      </button>
      {data.experiences.length === 0 && (
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
          Nenhuma experiência adicionada.
        </p>
      )}
    </div>
  );
}