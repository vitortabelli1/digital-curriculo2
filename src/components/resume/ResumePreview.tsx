"use client";

import { useEffect, useRef, useState } from "react";
import { useResume } from "@/lib/resume-context";
import { FONT_MAP, getTemplate, type TemplateConfig } from "@/lib/templates";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

function SectionTitle({ t, children }: { t: TemplateConfig; children: React.ReactNode }) {
  return (
    <h3
      className="mb-2 border-b-2 pb-1 text-xs font-bold uppercase tracking-widest"
      style={{
        borderColor: t.palette.accent,
        color: t.palette.text,
        fontFamily: FONT_MAP[t.font].web,
      }}
    >
      {children}
    </h3>
  );
}

function Placeholder({ t, text }: { t: TemplateConfig; text: string }) {
  return (
    <span className="font-normal italic" style={{ color: t.palette.muted }}>
      {text}
    </span>
  );
}

function Chips({ t, skills }: { t: TemplateConfig; skills: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <span
          key={skill}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            backgroundColor: t.palette.chipBg,
            color: t.palette.chipText,
            border: `1px solid ${t.palette.chipBorder}`,
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function ContactLine({ t, data }: { t: TemplateConfig; data: ReturnType<typeof useResume>["data"] }) {
  const items = [data.email, data.phone, data.city, data.linkedin].filter(Boolean);
  return (
    <div
      className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]"
      style={{ color: t.palette.headerAccent, fontFamily: FONT_MAP[t.font].web }}
    >
      {items.map((item, i) => (
        <span key={i} className="break-words">
          {item}
          {i < items.length - 1 && <span className="ml-3">•</span>}
        </span>
      ))}
    </div>
  );
}

function SidebarLayout({ t, data }: { t: TemplateConfig; data: ReturnType<typeof useResume>["data"] }) {
  return (
    <div className="flex min-h-[1123px]" style={{ fontFamily: FONT_MAP[t.font].web }}>
      <aside
        className="w-[34%] shrink-0 p-6 sm:p-8"
        style={{ backgroundColor: t.palette.headerBg, color: t.palette.headerText }}
      >
        <h1 className="text-xl font-bold leading-tight sm:text-2xl">
          {data.fullName || "Seu Nome Completo"}
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: t.palette.headerAccent }}>
          {data.jobTitle || "Seu Cargo Desejado"}
        </p>

        {(data.email || data.phone || data.city || data.linkedin) && (
          <div className="mt-6 space-y-2.5 text-xs leading-relaxed sm:text-[13px]">
            {data.email && (
              <p className="break-words">
                <span className="font-semibold" style={{ color: t.palette.headerAccent }}>
                  Email:{" "}
                </span>
                {data.email}
              </p>
            )}
            {data.phone && (
              <p>
                <span className="font-semibold" style={{ color: t.palette.headerAccent }}>
                  Telefone:{" "}
                </span>
                {data.phone}
              </p>
            )}
            {data.city && (
              <p>
                <span className="font-semibold" style={{ color: t.palette.headerAccent }}>
                  Localização:{" "}
                </span>
                {data.city}
              </p>
            )}
            {data.linkedin && (
              <p className="break-words">
                <span className="font-semibold" style={{ color: t.palette.headerAccent }}>
                  LinkedIn:{" "}
                </span>
                {data.linkedin}
              </p>
            )}
          </div>
        )}

        {data.skills.length > 0 && (
          <div className="mt-6">
            <h3
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: t.palette.headerAccent }}
            >
              Habilidades
            </h3>
            <Chips t={t} skills={data.skills} />
          </div>
        )}
      </aside>

      <main className="flex-1 p-6 sm:p-8" style={{ backgroundColor: t.palette.paper, color: t.palette.text }}>
        <BodySections t={t} data={data} />
      </main>
    </div>
  );
}

function BandLayout({ t, data }: { t: TemplateConfig; data: ReturnType<typeof useResume>["data"] }) {
  return (
    <div
      className="min-h-[1123px]"
      style={{ backgroundColor: t.palette.paper, color: t.palette.text, fontFamily: FONT_MAP[t.font].web }}
    >
      <header className="px-6 pb-4 pt-8 sm:px-10 sm:pt-10" style={{ backgroundColor: t.palette.headerBg }}>
        <h1
          className="text-2xl font-bold leading-tight sm:text-3xl"
          style={{ color: t.palette.headerText }}
        >
          {data.fullName || "Seu Nome Completo"}
        </h1>
        <p className="mt-1 text-sm font-semibold sm:text-base" style={{ color: t.palette.headerAccent }}>
          {data.jobTitle || "Seu Cargo Desejado"}
        </p>
        <div className="mt-2.5">
          <ContactLine t={t} data={data} />
        </div>
      </header>

      <main className="px-6 pb-10 pt-6 sm:px-10 sm:pt-7">
        <BodySections t={t} data={data} />
      </main>
    </div>
  );
}

function BodySections({
  t,
  data,
}: {
  t: TemplateConfig;
  data: ReturnType<typeof useResume>["data"];
}) {
  const s = t.fontSizeScale;
  const sectionMb = { marginBottom: 6 * s * 4 };
  return (
    <>
      <section style={sectionMb}>
        <SectionTitle t={t}>Resumo Profissional</SectionTitle>
        <p style={{ fontSize: 14 * s, lineHeight: 1.6 }}>
          {data.summary || <Placeholder t={t} text="Escreva um breve resumo profissional..." />}
        </p>
      </section>

      <section style={sectionMb}>
        <SectionTitle t={t}>Experiência Profissional</SectionTitle>
        {data.experiences.length === 0 ? (
          <p className="text-sm italic" style={{ color: t.palette.muted }}>
            <Placeholder t={t} text="Adicione suas experiências..." />
          </p>
        ) : (
          <div className="space-y-4">
            {data.experiences.map((exp) => (
              <div key={exp.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h4 className="text-sm font-bold" style={{ fontSize: 14 * s }}>
                    {exp.role || <Placeholder t={t} text="Cargo" />}
                  </h4>
                  <span className="text-xs font-medium" style={{ color: t.palette.muted }}>
                    {exp.period || <Placeholder t={t} text="Período" />}
                  </span>
                </div>
                <p className="text-xs font-semibold" style={{ color: t.palette.accent }}>
                  {exp.company || <Placeholder t={t} text="Empresa" />}
                </p>
                {exp.description && (
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed" style={{ fontSize: 13 * s }}>
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle t={t}>Formação Acadêmica</SectionTitle>
        {data.education.length === 0 ? (
          <p className="text-sm italic" style={{ color: t.palette.muted }}>
            <Placeholder t={t} text="Adicione sua formação..." />
          </p>
        ) : (
          <div className="space-y-3">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <h4 className="text-sm font-bold" style={{ fontSize: 14 * s }}>
                  {edu.degree || <Placeholder t={t} text="Curso" />}
                </h4>
                <p className="text-xs font-semibold" style={{ color: t.palette.accent }}>
                  {edu.institution || <Placeholder t={t} text="Instituição" />}
                </p>
                {edu.year && (
                  <p className="text-xs" style={{ color: t.palette.muted }}>
                    {edu.year}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {data.certifications.length > 0 && (
        <section className="mt-6">
          <SectionTitle t={t}>Certificações</SectionTitle>
          <Chips t={t} skills={data.certifications} />
        </section>
      )}

      {data.languages.length > 0 && (
        <section className="mt-6">
          <SectionTitle t={t}>Idiomas</SectionTitle>
          <Chips t={t} skills={data.languages} />
        </section>
      )}
    </>
  );
}

export function ResumePreview({
  protected: isProtected = false,
  data: dataOverride,
  realSize = false,
}: {
  protected?: boolean;
  data?: ReturnType<typeof useResume>["data"];
  realSize?: boolean;
}) {
  const ctx = useResume();
  const data = dataOverride ? { ...dataOverride, templateId: ctx.data.templateId } : ctx.data;
  const t = getTemplate(data.templateId);

  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.getBoundingClientRect().width / PAGE_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`relative mx-auto ${realSize ? "w-full" : "w-full max-w-[794px]"}`}>
      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-lg"
        style={{
          height: PAGE_HEIGHT * scale,
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: PAGE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className={isProtected ? "pointer-events-none select-none" : ""}
            style={isProtected ? { filter: "blur(10px)", opacity: 0.6 } : undefined}
            aria-hidden={isProtected}
          >
            {t.layout === "sidebar" ? (
              <SidebarLayout t={t} data={data} />
            ) : (
              <BandLayout t={t} data={data} />
            )}
          </div>

          {isProtected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/40 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg dark:bg-zinc-900 dark:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-zinc-700 dark:text-white"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <p className="whitespace-nowrap px-4 text-sm font-semibold text-white drop-shadow">
                Prévia protegida — desbloqueie após o pagamento
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}