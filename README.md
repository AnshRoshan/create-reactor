# create-reactor

Your personal React project generator. Answer a few questions — or pick a preset — and get a fully wired-up modern stack. No more repeating boilerplate.

```sh
npm create reactor@latest my-app
# or: bun create reactor my-app  ·  pnpm create reactor my-app  ·  yarn create reactor my-app
```

## Presets (one answer instead of twelve)

| Preset | What you get |
| ------ | ------------ |
| **Minimal** | Vite + TS + Tailwind v4 + shadcn/ui + TanStack Router |
| **SaaS** | Convex + Clerk + Stripe + Resend + PostHog + Sentry + Fallow + charts + tests + E2E + CI + deploy configs |
| **Full-stack API** | Hono + tRPC + Drizzle + Neon + Clerk + Biome + Fallow + tests + CI |
| **AI app** | Convex + Clerk + AI SDK (Claude) streaming chat |
| **Everything** | Every feature and every extra — the kitchen sink |
| **Custom** | Choose every option yourself |

## Everything it can set up

| Layer | Options |
| ----- | ------- |
| Build | **Vite** (Rolldown/OXC-powered) + **React 19** + **TypeScript** (always) |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (always, pick which components) |
| Routing | **TanStack Router** (file-based) · React Router · none |
| Backend | **Convex** · Supabase · **Hono + tRPC** (typed API server) · none |
| ORM | **Drizzle** · Prisma · none |
| Database | **Neon** (serverless Postgres) · Local Postgres (Docker) · **Turso** (SQLite) · Supabase · any Postgres |
| Auth | **Clerk** · **Better Auth** · Convex Auth · Supabase Auth · none |
| State | **Zustand** · Jotai · Redux Toolkit · none |
| Linting | **ESLint + Prettier** · **Biome** (Rust, one tool) |
| AI | **AI SDK** with Anthropic / OpenAI / Google |
| Data & UI libs | TanStack Query · TanStack Table · React Hook Form + Zod · Recharts · Motion · GSAP · Tiptap · Leaflet · date-fns · nuqs · Upstash Redis |
| SaaS features | Stripe · Resend + React Email · PostHog · react-i18next · PWA · deploy configs (Docker/Vercel/Netlify) |
| Quality | Vitest + Testing Library · **Playwright E2E** · MSW · Storybook · Husky + lint-staged · GitHub Actions CI · Sentry · **Fallow** (dead code/duplication/complexity audit) · Knip |
| Security | **Supply-chain protection**: 7-day package cooldown (bun/pnpm/npm) — on by default |
| AI-native | Every project ships **AGENTS.md + CLAUDE.md** so AI coding assistants understand it instantly |

## Usage

### Interactive (recommended)

```sh
npm create reactor@latest
```

### One-liners

```sh
# Pick a preset
npm create reactor@latest my-app -- --preset saas
npm create reactor@latest my-app -- --preset everything --yes

# Preset + overrides
npm create reactor@latest my-app -- --preset saas --ai anthropic --linter biome

# Fully custom via flags
npm create reactor@latest my-app -- --backend hono --orm drizzle --db neon \
  --auth clerk --state jotai --linter biome --extras charts,e2e,deploy --yes
```

> With `npm create`, flags go after a `--` separator. With `bun create reactor my-app --preset saas` you can drop the separator.

### All flags

```
--preset <minimal|saas|fullstack|ai|everything|custom>
--pm <bun|pnpm|npm>                            package manager
--backend <convex|supabase|hono|none>          backend / API server
--orm <drizzle|prisma|none>                    ORM (not for Convex)
--db <neon|docker|turso|supabase|other>        database provider (with an ORM)
--auth <clerk|better-auth|convex-auth|supabase-auth|none>
--router <tanstack|react-router|none>          routing
--state <zustand|jotai|redux|none>             state management
--linter <eslint|biome>                        linter/formatter
--ai <anthropic|openai|google|none>            AI SDK provider
--components <label,dialog,table,...>          extra shadcn/ui components
--extras <a,b,c | all>                         query, table, forms, charts, motion, gsap, editor,
                                               maps, dates, nuqs, redis, stripe, resend, posthog,
                                               i18n, pwa, deploy, testing, e2e, msw, storybook,
                                               prettier, husky, ci, sentry, knip
--no-secure / --no-git / --no-install / --no-verify
-y, --yes                                      accept defaults, no prompts
```

### Install globally (optional)

```sh
npm install -g create-reactor
# then from anywhere:
create-reactor my-app --preset saas
```

## Notes

- **Verification built in**: every generation ends with a real `build` (+ tests when selected), so you know the project works before you open it.
- **Supply-chain protection** is on by default — generated projects refuse to install packages younger than 7 days (the window in which malicious versions are caught). Disable with `--no-secure`.
- **Convex / Clerk / Stripe / etc. logins** can't be automated — the generated README and terminal output give you the exact steps and every `.env` placeholder is pre-created.
- The generator always installs `@latest` of everything, so it never goes stale.

## Maintaining the generator

```
create-app.mjs              # CLI: prompts + orchestration
lib/presets.mjs             # preset definitions
lib/pm.mjs                  # package manager detection + command mapping
lib/build.mjs               # config -> files + deps plan
lib/templates/
  base.mjs                  # vite/ts/tailwind/shadcn/env/config files
  app.mjs                   # React source files (main.tsx, routes, components)
  backend.mjs               # convex/supabase/drizzle/prisma/ai/better-auth files
  server.mjs                # hono + tRPC server files
  state.mjs                 # zustand/jotai/redux stores + demos
  features.mjs              # stripe/resend/posthog/i18n/pwa/deploy/charts/gsap/tiptap/leaflet
  quality.mjs               # playwright/msw templates
  biome.mjs                 # biome config + linter abstraction
  ai-docs.mjs               # AGENTS.md + CLAUDE.md generation
  security.mjs              # supply-chain protection configs
  extras.mjs                # table/motion/vitest/husky/ci/sentry templates
  readme.mjs                # generated README + next-steps checklist
```
