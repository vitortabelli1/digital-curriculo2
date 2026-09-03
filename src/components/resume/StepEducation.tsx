"use client";

import { useResume } from "@/lib/resume-context";
import { Field } from "@/components/ui/Field";

function EducationCard({
  id,
  index,
  onRemove,
}: {
  id: string;
  index: number;
  onRemove: () => void;
}) {
  const { data, updateEducation } = useResume();
  const edu = data.education.find((e) => e.id === id);

  if (!edu) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Formação {index + 1}
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
          label="Curso"
          placeholder="Bacharelado em Administração"
          value={edu.degree}
          onChange={(e) => updateEducation(id, "degree", e.target.value)}
        />
        <Field
          label="Instituição"
          placeholder="Universidade de São Paulo"
          value={edu.institution}
          onChange={(e) => updateEducation(id, "institution", e.target.value)}
        />
        <Field
          label="Ano de conclusão"
          placeholder="2020"
          value={edu.year}
          onChange={(e) => updateEducation(id, "year", e.target.value)}
        />
      </div>
    </div>
  );
}

export function StepEducation() {
  const { data, addEducation, removeEducation } = useResume();

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Adicione sua formação acadêmica e cursos relevantes.
      </p>
      {data.education.map((edu, i) => (
        <EducationCard
          key={edu.id}
          id={edu.id}
          index={i}
          onRemove={() => removeEducation(edu.id)}
        />
      ))}
      <button
        type="button"
        onClick={addEducation}
        className="w-full rounded-2xl border-2 border-dashed border-zinc-300 py-3.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-[#FF5A1F] hover:text-[#FF5A1F] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-[#FF5A1F] dark:hover:text-[#FF5A1F]"
      >
        + Adicionar formação
      </button>
      {data.education.length === 0 && (
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
          Nenhuma formação adicionada.
        </p>
      )}
    </div>
  );
}