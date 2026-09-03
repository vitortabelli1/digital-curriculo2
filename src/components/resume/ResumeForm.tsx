"use client";

import { useState } from "react";
import { useResume } from "@/lib/resume-context";
import { Button } from "@/components/ui/Button";
import { StepContact } from "./StepContact";
import { StepExperience } from "./StepExperience";
import { StepEducation } from "./StepEducation";
import { StepSkills } from "./StepSkills";

const baseSteps = [
  { key: "contact", title: "Contato", component: StepContact },
  { key: "experience", title: "Experiência", component: StepExperience },
  { key: "education", title: "Formação", component: StepEducation },
  { key: "skills", title: "Habilidades", component: StepSkills },
] as const;

export function ResumeForm({ onComplete, excludeSkills = false }: { onComplete: () => void; excludeSkills?: boolean }) {
  useResume();
  const [current, setCurrent] = useState(0);
  const steps = excludeSkills
    ? baseSteps.filter((s) => s.key !== "skills")
    : baseSteps;

  const CurrentStep = steps[current].component;

  const handleNext = () => {
    setCurrent((c) => Math.min(c + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrent((c) => Math.max(c - 1, 0));
  };

  const progress = ((current + 1) / steps.length) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm font-medium">
          <span className="text-zinc-500 dark:text-zinc-400">
            Etapa {current + 1} de {steps.length}
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {steps[current].title}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <CurrentStep />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={current === 0}
        >
          Anterior
        </Button>
        {current < steps.length - 1 ? (
          <Button onClick={handleNext}>Próximo</Button>
        ) : (
          <Button onClick={onComplete}>Próximo</Button>
        )}
      </div>
    </div>
  );
}