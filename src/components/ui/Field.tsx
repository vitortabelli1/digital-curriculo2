import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  rows?: number;
}

const baseFieldClass =
  "mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

function Label({ children }: { children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {children}
    </label>
  );
}

function ErrorMsg({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      {error}
    </p>
  );
}

export function Field({ label, error, hint, id, className = "", ...props }: FieldProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input id={fieldId} className={baseFieldClass} {...props} />
      {hint && !error && (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      <ErrorMsg error={error} />
    </div>
  );
}

export function TextArea({ label, error, hint, rows = 4, id, className = "", ...props }: TextAreaProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={className}>
      <Label>{label}</Label>
      <textarea id={fieldId} rows={rows} className={`${baseFieldClass} resize-y`} {...props} />
      {hint && !error && (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      <ErrorMsg error={error} />
    </div>
  );
}