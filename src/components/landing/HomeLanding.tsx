"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CircleCheck,
  Crown,
  Download,
  FileText,
  Gauge,
  ScanSearch,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  WandSparkles,
  Zap,
} from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { PlanCards } from "@/components/resume/PlanSelector";
import { type PlanId } from "@/lib/plans";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export function HomeLanding({
  onStart,
  onSelectPlan,
}: {
  onStart: () => void;
  onSelectPlan: (planId: PlanId) => void;
}) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 h-20 border-b border-[#ECECEC] bg-white/85 backdrop-blur-[12px]">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex cursor-pointer items-center gap-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111111] text-sm font-extrabold text-white">
              CV
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#111111]">
              eCurrículo Digital
            </span>
          </button>

          <nav className="hidden items-center gap-8 text-base font-medium text-[#6B7280] md:flex">
            <button type="button" onClick={() => scrollTo("como-funciona")} className="cursor-pointer transition-colors hover:text-[#111111]">
              Como funciona
            </button>
            <button type="button" onClick={() => scrollTo("beneficios")} className="cursor-pointer transition-colors hover:text-[#111111]">
              Benefícios
            </button>
            <button type="button" onClick={() => scrollTo("exemplos")} className="cursor-pointer transition-colors hover:text-[#111111]">
              Exemplos
            </button>
            <button type="button" onClick={() => scrollTo("depoimentos")} className="cursor-pointer transition-colors hover:text-[#111111]">
              Depoimentos
            </button>
            <button type="button" onClick={() => scrollTo("planos")} className="cursor-pointer transition-colors hover:text-[#111111]">
              Planos
            </button>
          </nav>

          <button
            type="button"
            onClick={onStart}
            className="hidden h-11 cursor-pointer items-center gap-2 rounded-full bg-[#111111] px-6 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_10px_30px_rgba(0,0,0,.15)] md:inline-flex"
          >
            Criar meu currículo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#FF5A1F]">
        {/* decorativos */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#FF7A45] opacity-30 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#FF7A45] opacity-30 blur-3xl" />
          <svg
            className="absolute left-0 top-0 h-full w-1/2 text-white/25"
            viewBox="0 0 400 800"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M-20 600 C 120 520, 220 680, 420 520"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M-20 620 C 140 540, 260 700, 420 560"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-[1280px] items-center gap-16 px-6 pb-[120px] pt-[140px] lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <h1 className="mt-6 max-w-xl text-[40px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[52px] lg:text-[72px]">
              Conquiste mais entrevistas.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
              Crie currículos modernos, profissionais e otimizados para ATS, destacando suas competências e experiências para chamar a atenção dos recrutadores.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onStart}
                className="group inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#111111] px-8 text-base font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,.15)] transition-all hover:-translate-y-0.5 hover:bg-black"
              >
                Criar meu currículo
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTo("exemplos")}
                className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-[#111111] transition-all hover:-translate-y-0.5 hover:bg-[#F8F8F8]"
              >
                Ver demonstração
              </button>
            </div>
          </motion.div>

          {/* Mockup hero */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="animate-float mx-auto w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-[0_40px_100px_rgba(0,0,0,.25)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4EF] text-[#FF5A1F]">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#111111]">Ana Souza</div>
                  <div className="text-sm text-[#6B7280]">Desenvolvedora Front-end</div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-[#F8F8F8]" />
                <div className="h-3 w-full rounded-full bg-[#F8F8F8]" />
                <div className="h-3 w-5/6 rounded-full bg-[#F8F8F8]" />
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#FFF4EF] p-4">
                <div>
                  <div className="text-xs font-medium text-[#6B7280]">ATS Score</div>
                  <div className="text-3xl font-extrabold text-[#FF5A1F]">92%</div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#22C55E]">
                  <TrendingUp className="h-7 w-7" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-[1280px] px-6 py-[120px]">
        <motion.div {...fadeUp} className="text-center">
          <h2 className="text-[40px] font-bold tracking-tight sm:text-[48px]">
            Como funciona
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-[#6B7280]">
            Em poucos passos seu currículo fica pronto para enviar.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            { icon: Target, t: "Escolha o plano", d: "Básico ou Premium, pague uma única vez." },
            { icon: FileText, t: "Preencha seus dados", d: "Editor rápido e intuitivo, passo a passo." },
            { icon: ScanSearch, t: "Análise ATS", d: "Seu currículo é lido como os sistemas dos recrutadores." },
            { icon: Brain, t: "Dicas", d: "Melhorias inteligentes para cada seção." },
            { icon: WandSparkles, t: "Otimização", d: "Profissional, moderno e otimizado." },
            { icon: Download, t: "Exporte em PDF", d: "Baixe na hora, pronto para enviar." },
          ].map((s) => (
            <div
              key={s.t}
              className="group rounded-3xl border border-[#ECECEC] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,.12)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF] text-[#FF5A1F]">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#111111]">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">{s.d}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="border-y border-[#ECECEC] bg-[#F8F8F8] py-[120px]">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="text-[40px] font-bold tracking-tight sm:text-[48px]">
              Mais entrevistas. Menos rejeições.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-[#6B7280]">
              Tudo o que você precisa para se destacar.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              { icon: Gauge, t: "ATS Score", d: "Seu currículo atende aos principais requisitos da vaga." },
              { icon: Brain, t: "Análise Inteligente", d: "Compreensão profunda da sua experiência." },
              { icon: Sparkles, t: "Sugestões IA", d: "Recomendações para melhorar cada seção." },
              { icon: Crown, t: "Currículo Premium", d: "Design moderno que impressiona recrutadores." },
              { icon: Download, t: "Exportação PDF", d: "Formato profissional, pronto para enviar." },
              { icon: Target, t: "Match de Vagas", d: "Compare seu currículo com a vaga desejada." },
            ].map((b) => (
              <div
                key={b.t}
                className="group rounded-3xl border border-[#ECECEC] bg-white p-8 shadow-[0_10px_40px_rgba(0,0,0,.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,.12)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4EF] text-[#FF5A1F]">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#111111]">{b.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">{b.d}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MOCKUP: análise */}
      <section className="mx-auto max-w-[1280px] px-6 py-[120px]">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF4EF] px-4 py-1.5 text-sm font-semibold text-[#FF5A1F]">
              <Zap className="h-4 w-4" />
              Matche sua vaga
            </span>
            <h2 className="mt-6 text-[40px] font-bold tracking-tight sm:text-[48px]">
              Veja o quanto você combina com a vaga
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-[#6B7280]">
              Análise inteligente compara seu currículo com a descrição da vaga
              e mostra, em tempo real, os pontos fortes e o que melhorar.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Pontuação de compatibilidade de 0% a 100%",
                "Destaque das palavras-chave mais relevantes",
                "Recomendações personalizadas",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] font-medium text-[#111111]">
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#22C55E]" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="animate-float rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-[0_40px_100px_rgba(0,0,0,.15)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[#111111]">Match da vaga</div>
                <span className="rounded-full bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#22C55E]">
                  92%
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex justify-between text-xs text-[#6B7280]">
                    <span>Aderência</span>
                    <span className="font-bold text-[#111111]">Alta</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F8F8F8]">
                    <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45]" />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Liderança", "Comunicação", "Capacidade Analítica", "Proatividade"].map((k) => (
                  <span key={k} className="rounded-full bg-[#FFF4EF] px-3 py-1 text-xs font-semibold text-[#FF5A1F]">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* EXEMPLOS */}
      <section id="exemplos" className="border-y border-[#ECECEC] bg-[#F8F8F8] py-[120px]">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="text-[40px] font-bold tracking-tight sm:text-[48px]">
              Exemplos de currículos
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-[#6B7280]">
              Modelos profissionais aprovados por recrutadores.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="group overflow-hidden rounded-3xl border border-[#ECECEC] bg-white shadow-[0_10px_40px_rgba(0,0,0,.08)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative h-56 overflow-hidden bg-[#F8F8F8] p-3">
                  <div className="flex h-full gap-2.5">
                    <div
                      className="flex w-1/3 flex-col gap-1.5 rounded-l p-2"
                      style={{ background: t.palette.headerBg }}
                    >
                      <div className="h-7 w-7 rounded-full" style={{ background: t.palette.headerAccent }} />
                      <div className="h-1.5 w-3/4 rounded-full bg-white/80" />
                      <div className="h-1 w-1/2 rounded-full bg-white/50" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                      <div className="h-2 w-1/2 rounded-full" style={{ background: t.palette.accent }} />
                      <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-11/12 rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-4/5 rounded-full bg-zinc-200" />
                    </div>
                  </div>
                </div>
                <div className="p-4 text-center text-sm font-semibold text-[#111111]">{t.name}</div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeUp} className="mt-14 text-center">
            <button
              type="button"
              onClick={onStart}
              className="group inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-8 text-base font-semibold text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] transition-all hover:-translate-y-0.5"
            >
              Ver todos os modelos
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="mx-auto max-w-[1280px] px-6 py-[120px]">
        <motion.div {...fadeUp} className="text-center">
          <h2 className="text-[40px] font-bold tracking-tight sm:text-[48px]">
            Resultados e depoimentos
          </h2>
        </motion.div>

        <motion.div {...fadeUp} className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Consegui diversas entrevistas após atualizar meu currículo.",
            "Meu currículo ficou muito mais profissional.",
            "Excelente investimento para quem quer recolocação.",
            "Fácil de usar e resultado incrível.",
          ].map((text, i) => (
            <div
              key={i}
              className="rounded-3xl border border-[#ECECEC] bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,.08)] transition-all duration-300 hover:-translate-y-2"
            >
              <div className="flex gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-[#111111]">“{text}”</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-white">
                  CV
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#111111]">Cliente verificado</div>
                  <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#22C55E]" />
                    eCurrículo Digital
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-t border-[#ECECEC] bg-[#F8F8F8] py-[120px]">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div {...fadeUp} className="text-center">
            <h2 className="text-[40px] font-bold tracking-tight sm:text-[48px]">
              Planos
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-[#6B7280]">
              Pagamento único, sem mensalidade. Acesso liberado na hora.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="mt-16 flex justify-center">
            <PlanCards onSelect={onSelectPlan} />
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-[#111111] py-[120px]">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.div {...fadeUp}>
            <h2 className="mx-auto max-w-3xl text-[40px] font-bold tracking-tight text-white sm:text-[52px]">
              Pronto para conquistar mais entrevistas?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Crie seu currículo profissional em poucos minutos.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("planos")}
              className="group mt-10 inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] px-10 text-base font-semibold text-white shadow-[0_10px_30px_rgba(255,90,31,.4)] transition-all hover:-translate-y-0.5"
            >
              Criar meu currículo
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#ECECEC] bg-white py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#6B7280] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111111] text-xs font-extrabold text-white">
              CV
            </span>
            <span className="font-bold text-[#111111]">eCurrículo Digital</span>
          </div>
          <p>© {new Date().getFullYear()} eCurrículo Digital. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
