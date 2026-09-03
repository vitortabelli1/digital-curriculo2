"use client";

import { useResume } from "@/lib/resume-context";
import { Field, TextArea } from "@/components/ui/Field";

export function StepContact() {
  const { data, update } = useResume();

  return (
    <div className="space-y-4">
      <Field
        label="Nome completo"
        placeholder="Maria da Silva"
        value={data.fullName}
        onChange={(e) => update("fullName", e.target.value)}
      />
      <TextArea
        label="Resumo profissional"
        hint="2–3 frases sobre sua trajetória e objetivos."
        placeholder="Profissional com 5 anos de experiência em..."
        rows={3}
        value={data.summary}
        onChange={(e) => update("summary", e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="E-mail"
          type="email"
          placeholder="maria@email.com"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <Field
          label="Telefone"
          placeholder="(11) 99999-9999"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <Field
          label="Cidade"
          placeholder="São Paulo, SP"
          value={data.city}
          onChange={(e) => update("city", e.target.value)}
        />
        <Field
          label="LinkedIn"
          placeholder="linkedin.com/in/maria"
          value={data.linkedin}
          onChange={(e) => update("linkedin", e.target.value)}
        />
      </div>
    </div>
  );
}