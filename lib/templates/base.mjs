// Base project files: package.json, index.html, vite config, tsconfig, eslint,
// Tailwind v4 + shadcn theme CSS, env files, shadcn config.
import { linterLintStaged, linterScripts } from "./biome.mjs";

/** package.json for the generated project (deps are added later via the package manager). */
export function pkgJson(c) {
  const scripts = {};

  if (c.backend === "convex") {
    scripts["dev"] = "npm-run-all --parallel dev:frontend dev:backend";
    scripts["dev:frontend"] = "vite";
    scripts["dev:backend"] = "convex dev";
    scripts["setup"] = "convex dev --until-success";
  } else if (c.backend === "hono") {
    scripts["dev"] = "npm-run-all --parallel dev:web dev:server";
    scripts["dev:web"] = "vite";
    scripts["dev:server"] = "tsx watch server/index.ts";
  } else {
    scripts["dev"] = "vite";
  }

  scripts["build"] = "vite build && tsc -b";
  scripts["preview"] = "vite preview";
  Object.assign(scripts, linterScripts(c));
  scripts["typecheck"] = "tsc -b";
  if (c.extras.includes("knip")) {
    scripts["knip"] = "knip";
  }
  if (c.extras.includes("fallow")) {
    // Full codebase analysis (dead code + duplication + complexity + health)
    scripts["quality"] = "fallow";
    // Changed-code audit vs the main branch (use before opening a PR)
    scripts["quality:audit"] = "fallow audit";
  }

  if (c.extras.includes("testing")) {
    scripts["test"] = "vitest run";
    scripts["test:watch"] = "vitest";
  }
  if (c.extras.includes("e2e")) {
    scripts["test:e2e"] = "playwright test";
    scripts["test:e2e:ui"] = "playwright test --ui";
  }
  // Note: the husky "prepare" script is added by the generator AFTER dependencies
  // are installed — otherwise package managers try to run `husky` mid-install
  // before it exists and the install fails.

  if (c.orm === "drizzle") {
    scripts["db:generate"] = "drizzle-kit generate";
    scripts["db:migrate"] = "drizzle-kit migrate";
    scripts["db:push"] = "drizzle-kit push";
    scripts["db:studio"] = "drizzle-kit studio";
  }
  if (c.orm === "prisma") {
    scripts["db:push"] = "prisma db push";
    scripts["db:generate"] = "prisma generate";
    scripts["db:studio"] = "prisma studio";
  }
  const pkg = {
    name: c.name,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts,
  };
  if (c.extras.includes("husky")) {
    pkg["lint-staged"] = linterLintStaged(c);
  }

  return JSON.stringify(pkg, null, 2);
}

export function indexHtml(c) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${c.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.2 260)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
`;
}

export function viteConfig(c) {
  const lines = [];
  if (c.extras.includes("testing")) {
    lines.push(`/// <reference types="vitest/config" />`);
  }
  lines.push(`import path from "node:path";`);
  lines.push(`import { defineConfig } from "vite";`);
  lines.push(`import react from "@vitejs/plugin-react";`);
  lines.push(`import tailwindcss from "@tailwindcss/vite";`);
  if (c.router === "tanstack") {
    lines.push(`import { tanstackRouter } from "@tanstack/router-plugin/vite";`);
  }
  if (c.extras.includes("pwa")) {
    lines.push(`import { VitePWA } from "vite-plugin-pwa";`);
  }
  lines.push(``);
  lines.push(`// https://vite.dev/config/`);
  lines.push(`export default defineConfig({`);
  lines.push(`  plugins: [`);
  if (c.router === "tanstack") {
    lines.push(`    // tanstackRouter must come before react()`);
    lines.push(`    tanstackRouter({ target: "react", autoCodeSplitting: true }),`);
  }
  lines.push(`    react(),`);
  lines.push(`    tailwindcss(),`);
  if (c.extras.includes("pwa")) {
    lines.push(`    VitePWA({`);
    lines.push(`      registerType: "autoUpdate",`);
    lines.push(`      manifest: {`);
    lines.push(`        name: "${c.name}",`);
    lines.push(`        short_name: "${c.name}",`);
    lines.push(`        theme_color: "#0a0a0a",`);
    lines.push(`        background_color: "#ffffff",`);
    lines.push(`        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],`);
    lines.push(`      },`);
    lines.push(`    }),`);
  }
  lines.push(`  ],`);
  lines.push(`  resolve: {`);
  lines.push(`    alias: {`);
  lines.push(`      "@": path.resolve(import.meta.dirname, "./src"),`);
  lines.push(`    },`);
  lines.push(`  },`);
  if (c.extras.includes("testing")) {
    lines.push(`  test: {`);
    lines.push(`    environment: "jsdom",`);
    lines.push(`    setupFiles: ["./src/test/setup.ts"],`);
    if (c.extras.includes("e2e")) {
      lines.push(`    // Playwright tests live in e2e/ and are run separately`);
      lines.push(`    exclude: ["e2e/**", "node_modules/**"],`);
    }
    lines.push(`  },`);
  }
  lines.push(`});`);
  return lines.join("\n") + "\n";
}

export function tsconfig() {
  return JSON.stringify(
    {
      files: [],
      references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
      compilerOptions: {
        paths: { "@/*": ["./src/*"] },
      },
    },
    null,
    2,
  );
}

export function tsconfigApp(c) {
  // Note: the convex/ folder is intentionally NOT included here — it is
  // typechecked separately by the Convex CLI using convex/tsconfig.json.
  void c;
  const include = ["src"];
  return JSON.stringify(
    {
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedSideEffectImports: true,
        paths: { "@/*": ["./src/*"] },
      },
      include,
    },
    null,
    2,
  );
}

export function tsconfigNode(c) {
  const include = ["vite.config.ts"];
  if (c.orm === "drizzle") include.push("drizzle.config.ts", "db");
  if (c.extras.includes("redis") && !include.includes("db")) include.push("db");
  if (c.backend === "hono") include.push("server");
  if (c.extras.includes("e2e")) include.push("playwright.config.ts", "e2e");
  return JSON.stringify(
    {
      compilerOptions: {
        tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
        target: "ES2023",
        lib: ["ES2023"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        moduleDetection: "force",
        noEmit: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        noUncheckedSideEffectImports: true,
        types: ["node"],
      },
      include,
    },
    null,
    2,
  );
}

export function eslintConfig(c) {
  const ignores = [`"dist"`];
  if (c.backend === "convex") ignores.push(`"convex/_generated"`);
  if (c.router === "tanstack") ignores.push(`"src/routeTree.gen.ts"`);
  if (c.orm === "prisma") ignores.push(`"src/generated"`);
  if (c.extras.includes("e2e")) ignores.push(`"playwright-report"`, `"test-results"`);
  if (c.extras.includes("storybook")) ignores.push(`"storybook-static"`, `".storybook"`);

  // TanStack Router file routes export a `Route` object instead of components,
  // so the fast-refresh rule doesn't apply to them (routes are code-split anyway).
  const routesOverride =
    c.router === "tanstack"
      ? `
  {
    files: ["src/routes/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },`
      : "";

  return `import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([${ignores.join(", ")}]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // react-hooks v7 moved flat configs under .flat; fall back for v6
      reactHooks.configs.flat?.["recommended-latest"] ?? reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui components export variants and hooks alongside components by design;
    // Storybook stories export meta objects — neither needs fast-refresh purity
    files: ["src/components/ui/**", "**/*.stories.*"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },${routesOverride}
]);
`;
}

export function gitignore(c) {
  const lines = [
    "# Logs",
    "logs",
    "*.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    "pnpm-debug.log*",
    "lerna-debug.log*",
    "",
    "node_modules",
    "dist",
    "dist-ssr",
    "*.local",
    "",
    "# Env files - never commit secrets",
    ".env",
    ".env.local",
    ".env.*.local",
    "",
    "# Editor directories and files",
    ".vscode/*",
    "!.vscode/extensions.json",
    ".idea",
    ".DS_Store",
    "*.suo",
    "*.ntvs*",
    "*.njsproj",
    "*.sln",
    "*.sw?",
  ];
  if (c.router === "tanstack") {
    lines.push("", "# TanStack Router generated route tree", "# (kept in git by convention; uncomment to ignore)", "# src/routeTree.gen.ts");
  }
  if (c.backend === "convex") {
    lines.push("", "# Convex", ".convex");
  }
  if (c.orm === "prisma") {
    lines.push("", "# Prisma generated client", "src/generated");
  }
  if (c.dbProvider === "turso") {
    lines.push("", "# Local SQLite databases", "*.db", "*.db-journal");
  }
  if (c.extras.includes("e2e")) {
    lines.push("", "# Playwright", "test-results", "playwright-report", "blob-report", "playwright/.cache");
  }
  if (c.extras.includes("storybook")) {
    lines.push("", "# Storybook", "storybook-static");
  }
  return lines.join("\n") + "\n";
}

/** Tailwind v4 + shadcn/ui (new-york, neutral) theme. */
export function indexCss() {
  return `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
}

/** shadcn/ui CLI configuration. */
export function componentsJson() {
  return JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: false,
      tsx: true,
      tailwind: {
        config: "",
        css: "src/index.css",
        baseColor: "neutral",
        cssVariables: true,
        prefix: "",
      },
      iconLibrary: "lucide",
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
      },
    },
    null,
    2,
  );
}

/** shadcn cn() helper. */
export function libUtils() {
  return `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

/** Typed import.meta.env declarations based on selected features. */
export function viteEnvDts(c) {
  const vars = [];
  if (c.backend === "convex") vars.push("VITE_CONVEX_URL");
  if (c.auth === "better-auth") vars.push("VITE_CONVEX_SITE_URL");
  if (c.auth === "clerk") vars.push("VITE_CLERK_PUBLISHABLE_KEY");
  if (c.backend === "supabase") vars.push("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY");
  if (c.extras.includes("sentry")) vars.push("VITE_SENTRY_DSN");
  if (c.extras.includes("stripe")) vars.push("VITE_STRIPE_PUBLISHABLE_KEY");
  if (c.extras.includes("posthog")) vars.push("VITE_POSTHOG_KEY", "VITE_POSTHOG_HOST");

  let out = `/// <reference types="vite/client" />\n`;
  if (vars.length > 0) {
    out += `
interface ImportMetaEnv {
${vars.map((v) => `  readonly ${v}: string;`).join("\n")}
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`;
  }
  return out;
}

/** .env.local with placeholders for the selected features. */
export function envLocal(c) {
  const lines = [];
  if (c.backend === "convex") {
    lines.push("# Convex - filled automatically when you run: " + c.pmRunLabel("setup"));
    lines.push("# CONVEX_DEPLOYMENT=");
    lines.push("# VITE_CONVEX_URL=");
    lines.push("");
  }
  if (c.auth === "better-auth") {
    lines.push("# Better Auth via Convex - same as VITE_CONVEX_URL but with .cloud replaced by .site");
    lines.push("# e.g. https://adjective-animal-123.convex.site");
    lines.push("VITE_CONVEX_SITE_URL=");
    lines.push("");
  }
  if (c.auth === "clerk") {
    lines.push("# Clerk - get from https://dashboard.clerk.com -> API Keys");
    lines.push("VITE_CLERK_PUBLISHABLE_KEY=");
    lines.push("");
  }
  if (c.backend === "supabase") {
    lines.push("# Supabase - get from https://supabase.com/dashboard -> Project Settings -> API");
    lines.push("VITE_SUPABASE_URL=");
    lines.push("VITE_SUPABASE_ANON_KEY=");
    lines.push("");
  }
  if (c.extras.includes("sentry")) {
    lines.push("# Sentry (optional) - get a DSN from https://sentry.io -> Project Settings -> Client Keys");
    lines.push("# Leave empty to disable error reporting locally");
    lines.push("VITE_SENTRY_DSN=");
    lines.push("");
  }
  if (c.extras.includes("stripe")) {
    lines.push("# Stripe - https://dashboard.stripe.com/apikeys (publishable key is safe for the browser)");
    lines.push("VITE_STRIPE_PUBLISHABLE_KEY=");
    lines.push("");
  }
  if (c.extras.includes("posthog")) {
    lines.push("# PostHog (optional) - https://app.posthog.com -> Project Settings -> API key");
    lines.push("# Leave empty to disable analytics locally");
    lines.push("VITE_POSTHOG_KEY=");
    lines.push("VITE_POSTHOG_HOST=https://us.i.posthog.com");
    lines.push("");
  }
  if (c.ai !== "none") {
    const keyName = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", google: "GOOGLE_GENERATIVE_AI_API_KEY" }[c.ai];
    if (c.backend === "convex") {
      lines.push(`# AI SDK - set ${keyName} on your Convex deployment instead of here:`);
      lines.push(`#   npx convex env set ${keyName} <your-key>`);
    } else {
      lines.push("# AI SDK - server-side key, never expose to the browser");
      lines.push(`${keyName}=`);
    }
    lines.push("");
  }
  return lines.length ? lines.join("\n") : "";
}

/** .env.example mirrors .env.local (committed to git). */
export function envExample(c) {
  let out = envLocal(c);
  const hasServerEnv =
    c.orm !== "none" || ["redis", "stripe", "resend"].some((e) => c.extras.includes(e));
  if (hasServerEnv) out += envDatabase(c);
  return out;
}

/** .env — server-side secrets: database connection (Drizzle/Prisma) and/or Upstash Redis. */
export function envDatabase(c) {
  const lines = [];
  if (c.orm !== "none") {
    const ormName = c.orm === "drizzle" ? "Drizzle" : "Prisma";
    if (c.dbProvider === "neon") {
      lines.push(`# Neon serverless Postgres (used by ${ormName})`);
      lines.push("# Create a free project at https://neon.tech, then copy the connection string");
      lines.push("# Format: postgresql://user:pass@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require");
      lines.push('DATABASE_URL=""');
    } else if (c.dbProvider === "turso") {
      lines.push("# Turso (libSQL) - create a database with: turso db create");
      lines.push("# Or use a local SQLite file during development: TURSO_DATABASE_URL=\"file:./local.db\"");
      lines.push('TURSO_DATABASE_URL="file:./local.db"');
      lines.push('TURSO_AUTH_TOKEN=""');
    } else if (c.dbProvider === "docker") {
      lines.push(`# Local Postgres via Docker (used by ${ormName})`);
      lines.push("# Start the database with: docker compose up -d");
      lines.push(`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${c.name.replace(/[^a-z0-9_]/gi, "_")}"`);
    } else if (c.backend === "supabase") {
      lines.push(`# Supabase Postgres (used by ${ormName})`);
      lines.push("# Supabase -> Project Settings -> Database -> Connection string (use the pooler in production)");
      lines.push('DATABASE_URL=""');
    } else {
      lines.push(`# Database connection string (used by ${ormName})`);
      lines.push("# Point this at your Postgres database");
      lines.push('DATABASE_URL=""');
    }
    lines.push("");
  }
  if (c.extras.includes("redis")) {
    lines.push("# Upstash Redis (server-side only) - create a database at https://console.upstash.com");
    lines.push('UPSTASH_REDIS_REST_URL=""');
    lines.push('UPSTASH_REDIS_REST_TOKEN=""');
    lines.push("");
  }
  if (c.extras.includes("stripe")) {
    lines.push("# Stripe secret key (server-side only - never expose to the browser)");
    lines.push('STRIPE_SECRET_KEY=""');
    lines.push("");
  }
  if (c.extras.includes("resend")) {
    lines.push("# Resend (server-side only) - https://resend.com/api-keys");
    lines.push('RESEND_API_KEY=""');
    lines.push("");
  }
  return lines.join("\n");
}

export function prettierrc() {
  return JSON.stringify(
    {
      semi: true,
      singleQuote: false,
      trailingComma: "all",
      plugins: ["prettier-plugin-tailwindcss"],
    },
    null,
    2,
  );
}

export function prettierignore() {
  return `dist
node_modules
convex/_generated
src/routeTree.gen.ts
bun.lock
pnpm-lock.yaml
package-lock.json
`;
}
