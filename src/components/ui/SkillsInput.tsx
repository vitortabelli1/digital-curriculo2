"use client";

import { useState, type KeyboardEvent } from "react";

interface SkillsInputProps {
  skills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
  label?: string;
}

export function SkillsInput({
  skills,
  onAdd,
  onRemove,
  label = "Habilidades",
}: SkillsInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    onAdd(value);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace" && !value && skills.length > 0) {
      onRemove(skills[skills.length - 1]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            {skill}
            <button
              type="button"
              onClick={() => onRemove(skill)}
              aria-label={`Remover ${skill}`}
              className="text-red-400 hover:text-red-500 dark:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
        {skills.length === 0 && (
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            Nenhuma habilidade adicionada ainda.
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim()}
          className="shrink-0 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          + Adicionar
        </button>
      </div>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        Pressione Enter ou vírgula para adicionar. Backspace remove a última.
      </p>
    </div>
  );
}