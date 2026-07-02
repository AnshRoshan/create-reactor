// Turns a config object into a concrete plan: files to write + deps to install.
import * as base from "./templates/base.mjs";
import * as app from "./templates/app.mjs";
import * as be from "./templates/backend.mjs";
import * as ex from "./templates/extras.mjs";
import * as feat from "./templates/features.mjs";
import * as quality from "./templates/quality.mjs";
import * as srv from "./templates/server.mjs";
import { statePlan } from "./templates/state.mjs";
import { securityFile } from "./templates/security.mjs";
import { agentsMd, claudeMd } from "./templates/ai-docs.mjs";
import { biomeJson, linterDevDeps } from "./templates/biome.mjs";
import { projectReadme } from "./templates/readme.mjs";
import { PM } from "./pm.mjs";

/** Linter / formatter options (single choice). */
export const LINTER_OPTIONS = [
  { value: "eslint", label: "ESLint (+ Prettier)", hint: "the established standard" },
  { value: "biome", label: "Biome", hint: "Rust-based, lint + format in one fast tool" },
];

/** State management options (single choice). */
export const STATE_OPTIONS = [
  { value: "zustand", label: "Zustand", hint: "lightweight hooks-based store (most popular)" },
  { value: "jotai", label: "Jotai", hint: "atomic, fine-grained state" },
  { value: "redux", label: "Redux Toolkit", hint: "the enterprise standard" },
  { value: "none", label: "None", hint: "add state management later" },
];

/** All valid extras, grouped for the prompts. */
export const EXTRAS = {
  libraries: [
    { value: "query", label: "TanStack Query", hint: "server-state / data fetching" },
    { value: "table", label: "TanStack Table", hint: "headless data tables + demo" },
    { value: "forms", label: "React Hook Form + Zod", hint: "forms + validation" },
    { value: "charts", label: "Recharts", hint: "charts + demo" },
    { value: "motion", label: "Motion (Framer Motion)", hint: "declarative animations" },
    { value: "gsap", label: "GSAP", hint: "timeline animations + demo" },
    { value: "editor", label: "Tiptap", hint: "rich text editor + demo" },
    { value: "maps", label: "Leaflet", hint: "interactive maps + demo (no API key)" },
    { value: "dates", label: "date-fns", hint: "date utilities" },
    { value: "nuqs", label: "nuqs", hint: "type-safe URL search-param state" },
    { value: "redis", label: "Upstash Redis", hint: "rate limiting / caching (server-side)" },
  ],
  features: [
    { value: "stripe", label: "Stripe", hint: "payments (client SDK + env wiring)" },
    { value: "resend", label: "Resend + React Email", hint: "transactional email templates" },
    { value: "posthog", label: "PostHog", hint: "product analytics + session replay" },
    { value: "i18n", label: "react-i18next", hint: "internationalization" },
    { value: "pwa", label: "PWA", hint: "installable app + offline (vite-plugin-pwa)" },
    { value: "deploy", label: "Deploy configs", hint: "Dockerfile + Vercel + Netlify" },
  ],
  tooling: [
    { value: "testing", label: "Vitest + Testing Library", hint: "unit/component tests" },
    { value: "e2e", label: "Playwright", hint: "end-to-end browser tests" },
    { value: "msw", label: "MSW", hint: "API mocking for tests (needs Vitest)" },
    { value: "storybook", label: "Storybook", hint: "component workshop (heavy install)" },
    { value: "prettier", label: "Prettier", hint: "+ Tailwind class sorting (ESLint only)" },
    { value: "husky", label: "Husky + lint-staged", hint: "lint/format on git commit" },
    { value: "ci", label: "GitHub Actions CI", hint: "lint + build + test workflow" },
    { value: "sentry", label: "Sentry", hint: "error monitoring" },
    { value: "fallow", label: "Fallow", hint: "dead code + duplication + complexity + PR audit (Rust)" },
    { value: "knip", label: "Knip", hint: "unused files/exports/deps (lighter alternative to Fallow)" },
  ],
};

/** Database provider options (asked when an ORM is selected). */
export const DB_PROVIDERS = {
  drizzle: ["neon", "docker", "turso", "supabase", "other"],
  prisma: ["neon", "docker", "supabase", "other"],
};

export const ALL_EXTRAS = [...EXTRAS.libraries, ...EXTRAS.features, ...EXTRAS.tooling].map(
  (e) => e.value,
);

/** Always installed so the starter UI works out of the box. */
export const ESSENTIAL_COMPONENTS = ["button", "card", "input", "badge"];

/** Offered as optional picks in the prompt. */
export const OPTIONAL_COMPONENTS = [
  "label",
  "dialog",
  "dropdown-menu",
  "sonner",
  "tabs",
  "avatar",
  "skeleton",
  "select",
  "checkbox",
  "switch",
  "textarea",
  "tooltip",
  "separator",
  "sheet",
  "table",
];

/** Add derived helpers (command labels for the chosen package manager). */
export function enrichConfig(raw) {
  const pm = PM[raw.pm];
  return {
    ...raw,
    pmRunLabel: (s) => pm.runLabel(s),
    pmDlxLabel: (p) => pm.dlxLabel(p),
    pmInstallLabel: `${pm.install[0]} ${pm.install[1].join(" ")}`,
  };
}

/** Validate cross-option constraints. Returns an error string or null. */
export function validateConfig(c) {
  if (c.auth === "convex-auth" && c.backend !== "convex") {
    return "Convex Auth requires the Convex backend (--backend convex).";
  }
  if (c.auth === "better-auth" && c.backend !== "convex") {
    return "Better Auth is currently wired through the Convex backend (--backend convex).";
  }
  if (c.auth === "supabase-auth" && c.backend !== "supabase") {
    return "Supabase Auth requires the Supabase backend (--backend supabase).";
  }
  if (c.orm !== "none" && c.backend === "convex") {
    return "Convex has its own database — Drizzle/Prisma only apply to other backends.";
  }
  if (c.dbProvider === "turso" && c.orm !== "drizzle") {
    return "Turso requires Drizzle (--orm drizzle).";
  }
  if (c.dbProvider === "supabase" && c.backend !== "supabase") {
    return "The Supabase database provider requires the Supabase backend.";
  }
  if (c.extras.includes("msw") && !c.extras.includes("testing")) {
    return "MSW requires Vitest (add 'testing' to your extras).";
  }
  return null;
}

/** Build the full plan: { files: Map<relPath, content>, deps: string[], devDeps: string[] }. */
export function buildPlan(c) {
  const files = new Map();
  const deps = ["react", "react-dom"];
  const devDeps = [
    "typescript",
    "vite",
    "@vitejs/plugin-react",
    "@types/react",
    "@types/react-dom",
    "@types/node",
    "tailwindcss",
    "@tailwindcss/vite",
    "tw-animate-css",
    // linter / formatter (ESLint stack or Biome)
    ...linterDevDeps(c),
  ];

  // shadcn/ui core runtime deps (components themselves are added via the shadcn CLI)
  deps.push("clsx", "tailwind-merge", "class-variance-authority", "lucide-react");

  // ---- base files -----------------------------------------------------------
  files.set("package.json", base.pkgJson(c));
  files.set("index.html", base.indexHtml(c));
  files.set("public/favicon.svg", base.favicon());
  files.set("vite.config.ts", base.viteConfig(c));
  files.set("tsconfig.json", base.tsconfig());
  files.set("tsconfig.app.json", base.tsconfigApp(c));
  files.set("tsconfig.node.json", base.tsconfigNode(c));
  if (c.linter === "biome") {
    files.set("biome.json", biomeJson(c));
  } else {
    files.set("eslint.config.js", base.eslintConfig(c));
  }
  files.set(".gitignore", base.gitignore(c));
  // AI-assistant instructions (Claude Code, Cursor, Copilot, ...)
  files.set("AGENTS.md", agentsMd(c));
  files.set("CLAUDE.md", claudeMd());
  files.set("src/index.css", base.indexCss());
  files.set("components.json", base.componentsJson());
  files.set("src/lib/utils.ts", base.libUtils());
  files.set("src/vite-env.d.ts", base.viteEnvDts(c));
  files.set("README.md", projectReadme(c));

  const envLocalContent = base.envLocal(c);
  if (envLocalContent) files.set(".env.local", envLocalContent);
  const envExampleContent = base.envExample(c);
  if (envExampleContent) files.set(".env.example", envExampleContent);
  const needsServerEnv =
    c.orm !== "none" || ["redis", "stripe", "resend"].some((e) => c.extras.includes(e));
  if (needsServerEnv) files.set(".env", base.envDatabase(c));

  // Supply-chain protection: 7-day minimum package release age
  if (c.secure) {
    const sec = securityFile(c.pm);
    if (sec) files.set(sec.filename, sec.content);
  }

  // ---- app source files -----------------------------------------------------
  files.set("src/main.tsx", app.mainTsx(c));
  files.set("src/components/header.tsx", app.header(c));
  files.set("src/components/theme-toggle.tsx", app.themeToggle());
  files.set("src/components/home.tsx", app.home(c));

  // ---- routing --------------------------------------------------------------
  if (c.router === "tanstack") {
    deps.push("@tanstack/react-router", "@tanstack/react-router-devtools");
    devDeps.push("@tanstack/router-plugin");
    files.set("src/routes/__root.tsx", app.rootRoute());
    files.set("src/routes/index.tsx", app.indexRoute());
    files.set("src/routes/about.tsx", app.aboutRoute());
  } else {
    files.set("src/App.tsx", app.appTsx(c));
    if (c.router === "react-router") deps.push("react-router");
  }

  // ---- backend ---------------------------------------------------------------
  if (c.backend === "convex") {
    deps.push("convex");
    devDeps.push("npm-run-all2");
    files.set("convex/tsconfig.json", be.convexTsconfig());
    files.set("convex/schema.ts", be.convexSchema(c));
    files.set("convex/tasks.ts", be.convexTasks());
    files.set("sampleData.jsonl", be.convexSampleData());
    files.set("convex/_generated/api.d.ts", be.convexGeneratedApiDts(c));
    files.set("convex/_generated/api.js", be.convexGeneratedApiJs());
    files.set("convex/_generated/dataModel.d.ts", be.convexGeneratedDataModelDts());
    files.set("convex/_generated/server.d.ts", be.convexGeneratedServerDts());
    files.set("convex/_generated/server.js", be.convexGeneratedServerJs());
    files.set("src/components/tasks-demo.tsx", app.tasksDemo(c));
    const httpTs = be.convexHttp(c);
    if (httpTs) files.set("convex/http.ts", httpTs);
    const authConfig = be.convexAuthConfig(c);
    if (authConfig) files.set("convex/auth.config.ts", authConfig);
  }
  if (c.backend === "supabase") {
    deps.push("@supabase/supabase-js");
    files.set("src/lib/supabase.ts", be.supabaseClient());
  }
  if (c.backend === "hono") {
    deps.push(
      "hono",
      "@hono/node-server",
      "@hono/trpc-server",
      "@trpc/server",
      "@trpc/client",
      "@trpc/tanstack-react-query",
      "@tanstack/react-query",
      "zod",
    );
    devDeps.push("tsx", "npm-run-all2");
    files.set("server/router.ts", srv.trpcRouter());
    files.set("server/index.ts", srv.honoServer());
    files.set("src/lib/trpc.ts", srv.trpcClient());
    files.set("src/components/trpc-demo.tsx", srv.trpcDemo(c));
  }

  // ---- auth ------------------------------------------------------------------
  if (c.auth !== "none") {
    files.set("src/components/auth-buttons.tsx", app.authButtons(c));
  }
  if (c.auth === "clerk") {
    deps.push("@clerk/clerk-react");
  }
  if (c.auth === "convex-auth") {
    deps.push("@convex-dev/auth", "@auth/core");
    files.set("convex/auth.ts", be.convexAuthTs());
    files.set("src/components/sign-in-form.tsx", app.signInForm());
  }
  if (c.auth === "better-auth") {
    deps.push("@convex-dev/better-auth", "better-auth");
    files.set("convex/convex.config.ts", be.convexConfigBetterAuth());
    files.set("convex/auth.ts", be.convexBetterAuthTs());
    files.set("src/lib/auth-client.ts", be.betterAuthClient());
    files.set("src/components/sign-in-form.tsx", app.signInFormBetterAuth());
  }
  if (c.auth === "supabase-auth") {
    files.set("src/hooks/use-session.ts", app.useSessionHook());
  }

  // ---- ORM + database provider ------------------------------------------------
  if (c.orm === "drizzle") {
    deps.push(...be.drizzleDeps(c));
    // dotenv is only used by drizzle.config.ts (a dev-time tool), so it's a devDep
    devDeps.push("drizzle-kit", "dotenv");
    files.set("drizzle.config.ts", be.drizzleConfig(c));
    files.set("db/schema.ts", be.drizzleSchema(c));
    files.set("db/index.ts", be.drizzleIndex(c));
  }
  if (c.orm === "prisma") {
    deps.push("@prisma/client");
    devDeps.push("prisma");
    // prisma/schema.prisma is created by `prisma init` post-step (or fallback file)
  }
  if (c.dbProvider === "docker") {
    files.set("docker-compose.yml", be.dockerCompose(c));
  }

  // ---- AI SDK ----------------------------------------------------------------
  if (c.ai !== "none") {
    const ai = be.AI_MODELS[c.ai];
    deps.push("ai", "@ai-sdk/react", ai.pkg);
    if (c.backend === "convex") {
      files.set("convex/chat.ts", be.convexChat(c));
      files.set("src/components/chat-demo.tsx", app.chatDemo(c));
    } else {
      devDeps.push("tsx");
      files.set("examples/ai.ts", be.aiExample(c));
    }
  }

  // ---- state management --------------------------------------------------------
  const state = statePlan(c.state ?? "none");
  deps.push(...state.deps);
  for (const [rel, content] of Object.entries(state.files)) files.set(rel, content);

  // ---- library extras -----------------------------------------------------------
  if (c.extras.includes("query") && c.backend !== "hono") {
    // (hono backend already includes @tanstack/react-query for tRPC)
    deps.push("@tanstack/react-query");
  }
  if (c.extras.includes("table")) {
    deps.push("@tanstack/react-table");
    files.set("src/components/data-table-demo.tsx", ex.dataTableDemo());
  }
  if (c.extras.includes("forms")) {
    deps.push("react-hook-form", "zod", "@hookform/resolvers");
  }
  if (c.extras.includes("charts")) {
    deps.push("recharts");
    files.set("src/components/chart-demo.tsx", feat.chartDemo());
  }
  if (c.extras.includes("motion")) {
    deps.push("motion");
    files.set("src/components/fade-in.tsx", ex.fadeIn());
  }
  if (c.extras.includes("gsap")) {
    deps.push("gsap", "@gsap/react");
    files.set("src/components/gsap-demo.tsx", feat.gsapDemo());
  }
  if (c.extras.includes("editor")) {
    deps.push("@tiptap/react", "@tiptap/pm", "@tiptap/starter-kit");
    files.set("src/components/editor-demo.tsx", feat.editorDemo());
  }
  if (c.extras.includes("maps")) {
    deps.push("leaflet", "react-leaflet");
    devDeps.push("@types/leaflet");
    files.set("src/components/map-demo.tsx", feat.mapDemo());
  }
  if (c.extras.includes("dates")) {
    deps.push("date-fns");
  }
  if (c.extras.includes("nuqs")) {
    deps.push("nuqs");
  }
  if (c.extras.includes("redis")) {
    deps.push("@upstash/redis", "@upstash/ratelimit");
    files.set("db/redis.ts", be.upstashRedis());
    files.set("db/ratelimit.ts", be.upstashRatelimit());
  }

  // ---- feature extras -----------------------------------------------------------
  if (c.extras.includes("stripe")) {
    deps.push("@stripe/stripe-js");
    files.set("src/lib/stripe.ts", feat.stripeLib());
  }
  if (c.extras.includes("resend")) {
    deps.push("resend", "@react-email/components");
    files.set("src/emails/welcome.tsx", feat.welcomeEmail(c));
  }
  if (c.extras.includes("posthog")) {
    deps.push("posthog-js");
    files.set("src/lib/posthog.ts", feat.posthogInit());
  }
  if (c.extras.includes("i18n")) {
    deps.push("i18next", "react-i18next");
    files.set("src/lib/i18n.ts", feat.i18nSetup());
  }
  if (c.extras.includes("pwa")) {
    devDeps.push("vite-plugin-pwa");
  }
  if (c.extras.includes("deploy")) {
    files.set("Dockerfile", feat.dockerfile(c));
    files.set("nginx.conf", feat.nginxConf());
    files.set(".dockerignore", feat.dockerignore());
    files.set("vercel.json", feat.vercelJson());
    files.set("netlify.toml", feat.netlifyToml());
  }

  // ---- tooling extras -----------------------------------------------------------
  if (c.extras.includes("testing")) {
    devDeps.push(
      "vitest",
      "jsdom",
      "@testing-library/react",
      "@testing-library/jest-dom",
      "@testing-library/user-event",
    );
    files.set("src/test/setup.ts", quality.testSetup(c));
    files.set("src/test/button.test.tsx", ex.sampleTest());
    files.set("src/lib/utils.test.ts", ex.utilsTest());
  }
  if (c.extras.includes("msw")) {
    devDeps.push("msw");
    files.set("src/test/mocks/handlers.ts", quality.mswHandlers());
    files.set("src/test/mocks/server.ts", quality.mswServer());
  }
  if (c.extras.includes("e2e")) {
    devDeps.push("@playwright/test");
    files.set("playwright.config.ts", quality.playwrightConfig(c));
    files.set("e2e/home.spec.ts", quality.playwrightExampleTest(c));
  }
  // (storybook has no files here — it's set up by `storybook init` as a post-step)
  if (c.extras.includes("prettier") && c.linter !== "biome") {
    // (deps are added by linterDevDeps; Biome formats on its own, so Prettier is skipped)
    files.set(".prettierrc", base.prettierrc());
    files.set(".prettierignore", base.prettierignore());
  }
  if (c.extras.includes("knip")) {
    devDeps.push("knip");
  }
  if (c.extras.includes("fallow")) {
    devDeps.push("fallow");
    files.set(".fallowrc.json", quality.fallowConfig(c));
  }
  if (c.extras.includes("husky")) {
    devDeps.push("husky", "lint-staged");
    files.set(".husky/pre-commit", ex.huskyPreCommit(c));
  }
  if (c.extras.includes("ci")) {
    files.set(".github/workflows/ci.yml", ex.githubCi(c));
  }
  if (c.extras.includes("sentry")) {
    deps.push("@sentry/react");
    files.set("src/lib/sentry.ts", ex.sentryInit());
  }

  return { files, deps, devDeps };
}
