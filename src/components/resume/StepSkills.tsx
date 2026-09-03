"use client";

import { useResume } from "@/lib/resume-context";
import { SkillsInput } from "@/components/ui/SkillsInput";

export function StepSkills() {
  const { data, addSkill, removeSkill, update } = useResume();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Liste suas principais habilidades técnicas e comportamentais.
        </p>
        <SkillsInput
          skills={data.skills}
          onAdd={addSkill}
          onRemove={removeSkill}
        />
        {data.skills.length >= 5 && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Boa quantidade de habilidades! Recomendamos 6 a 10 no currículo final.
          </p>
        )}
      </div>

      <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Idiomas e certificações enriquecem seu currículo e melhoram sua
          pontuação em sistemas ATS.
        </p>
        <SkillsInput
          label="Idiomas"
          skills={data.languages}
          onAdd={(item) => update("languages", [...data.languages, item])}
          onRemove={(item) =>
            update(
              "languages",
              data.languages.filter((l) => l !== item)
            )
          }
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ex.: Inglês — Avançado, Espanhol — Intermediário
        </p>
      </div>

      <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <SkillsInput
          label="Certificações"
          skills={data.certifications}
          onAdd={(item) => update("certifications", [...data.certifications, item])}
          onRemove={(item) =>
            update(
              "certifications",
              data.certifications.filter((c) => c !== item)
            )
          }
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Ex.: Excel Avançado, SCRUM Master, AWS Practitioner
        </p>
      </div>
    </div>
  );
}