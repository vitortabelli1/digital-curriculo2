# CurrículoIA — Gerador de Currículos com IA

Web app (PWA) que gera currículos profissionais formatados em PDF a partir de um formulário guiado, com **20 modelos de design** à escolha. Dois planos de pagamento via Stripe:

| Plano | Preço | Inclui |
| --- | --- | --- |
| **Básico** | R$ 19,99 | Currículo em PDF (20 modelos) |
| **Premium** | R$ 24,99 | PDF + **correção do texto por IA** (resumo, experiências, cargo e habilidades reescritos) |
| Carta de apresentação (upsell) | R$ 9,90 | Carta personalizada por IA (OpenAI) |

## Funcionalidades

- Formulário multi-etapas: contato, experiências, formação e habilidades (validação incluída)
- **20 modelos de design** (Moderno, Clássico, Minimalista, Ousado, Elegante, Criativo, Compacto, Tech, Profissional, Colorido, Executivo, Corporativo, Marinho, Grafite, Solar, Terracota, Vinho, Meia-noite, Gelo, Retrô) com seletor visual — preview e PDF saem idênticos
- Preview do currículo em tempo real (A4)
- Geração de PDF no cliente com `@react-pdf/renderer` (sem envio de dados ao servidor)
- Seletor de planos (Básico/Premium) com checkout Stripe em BRL
- **Correção por IA** no plano Premium: revisão antes/depois e aplicação das melhorias (`/api/correct`)
- Carta de apresentação gerada por IA (gpt-4o-mini) como upsell — R$ 9,90
- Fallback de carta por template local caso a OpenAI falhe ou não esteja configurada
- Design responsivo (mobile-first) + PWA instalável no celular
- Dark mode automático

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- @react-pdf/renderer
- Stripe (Checkout Sessions)
- OpenAI Chat Completions

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Descrição |
| --- | --- |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (`sk_test_...` no modo teste) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe |
| `NEXT_PUBLIC_APP_URL` | URL do app (ex.: `http://localhost:3000` em dev) |
| `OPENAI_API_KEY` | Chave da API da OpenAI (opcional — sem ela a carta usa template) |

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

### 4. Cartões de teste (Stripe)

No modo teste, use qualquer um dos cartões listados em
[https://docs.stripe.com/testing](https://docs.stripe.com/testing):

- **Pagamento aprovado:** `4242 4242 4242 4242` — qualquer data futura e CVC
- **Pagamento recusado:** `4000 0000 0000 0002`

## Fluxo do usuário

1. Preenche o formulário (4 etapas) e escolhe um dos 20 modelos → preview ao vivo
2. Clique em **Baixar PDF** → modal de planos (**Básico R$ 19,99** ou **Premium R$ 24,99**) → checkout Stripe
3. Após o pagamento, `/success` valida a sessão e o plano pago
4. **Premium:** a IA corrige o currículo → revisão antes/depois → "Aplicar correções e baixar PDF"
5. **Básico:** download direto do PDF
6. Upsell: **carta de apresentação — R$ 9,90** → `/cover-letter` gera a carta por IA (copiar ou baixar `.txt`)

## Deploy (Vercel)

1. Suba o repositório para o GitHub
2. Importe no [Vercel](https://vercel.com) (o projeto já usa o padrão Next.js)
3. Configure as variáveis de ambiente no dashboard (use `NEXT_PUBLIC_APP_URL` = URL final do deploy, com `https://`)
4. **Importante:** com cobrança real, substitua as chaves `sk_test_` por `sk_live_` e configure o webhook do Stripe (opcional: eventos `checkout.session.completed`) se quiser persistir pagamentos em banco

## Segurança

- O PDF é gerado no navegador do usuário — os dados do currículo **não** são armazenados no servidor
- A validação de pagamento é feita no servidor consultando o Stripe (`payment_status`)
- As chaves secretas ficam apenas no servidor (`.env.local` / env vars do Vercel)
- Para produção com fluxos mais robustos (assinaturas, re-download, e-mail), adicione um banco de dados e webhooks do Stripe