// Generated project README.md and the post-create "next steps" checklist.
import { AI_MODELS } from "./backend.mjs";
import { aiLabel, stackList } from "./app.mjs";

/**
 * Ordered list of manual steps the user must do after generation.
 * Each entry: { title, details: string[] } (details are shell commands or notes).
 */
export function nextSteps(c) {
  const steps = [];

  if (!c.install) {
    steps.push({
      title: "Install dependencies",
      details: [`cd ${c.name}`, c.pmInstallLabel],
    });
  }

  if (c.backend === "convex") {
    steps.push({
      title: "Connect Convex (one-time: logs in, creates your dev deployment)",
      details: [`cd ${c.name}`, c.pmRunLabel("setup")],
    });
    steps.push({
      title: "Import sample data into the tasks table (optional)",
      details: [`${c.pmDlxLabel("convex")} import --table tasks sampleData.jsonl`],
    });
  }

  if (c.backend === "supabase") {
    steps.push({
      title: "Create a Supabase project and copy the API credentials",
      details: [
        "https://supabase.com/dashboard -> New project",
        "Project Settings -> API -> copy URL and anon key into .env.local",
      ],
    });
  }

  if (c.auth === "better-auth") {
    steps.push({
      title: "Configure Better Auth on your Convex deployment",
      details: [
        `${c.pmDlxLabel("convex")} env set BETTER_AUTH_SECRET <random-32+-char-string>`,
        `${c.pmDlxLabel("convex")} env set SITE_URL http://localhost:5173`,
        "Then fill VITE_CONVEX_SITE_URL in .env.local (your VITE_CONVEX_URL with .cloud -> .site)",
      ],
    });
  }

  if (c.auth === "clerk") {
    const details = [
      "https://dashboard.clerk.com -> Create application",
      "Copy the Publishable Key into .env.local as VITE_CLERK_PUBLISHABLE_KEY",
    ];
    if (c.backend === "convex") {
      details.push(
        'Clerk Dashboard -> JWT templates -> New template -> "Convex" (keep the name "convex")',
        "Copy the template's Issuer URL, then run:",
        `${c.pmDlxLabel("convex")} env set CLERK_JWT_ISSUER_DOMAIN <issuer-url>`,
      );
    }
    steps.push({ title: "Set up Clerk", details });
  }

  if (c.auth === "convex-auth") {
    steps.push({
      title: "Generate Convex Auth keys (one-time)",
      details: [
        `${c.pmDlxLabel("@convex-dev/auth")}`,
        "(this sets JWT_PRIVATE_KEY / JWKS on your Convex deployment)",
      ],
    });
  }

  if (c.auth === "supabase-auth") {
    steps.push({
      title: "Enable an auth provider in Supabase",
      details: [
        "Supabase Dashboard -> Authentication -> Providers -> enable GitHub (or email)",
        "The starter's sign-in button uses the GitHub OAuth provider",
      ],
    });
  }

  if (c.orm !== "none") {
    const ormName = c.orm === "drizzle" ? "Drizzle" : "Prisma";
    const dbDetails = {
      neon: [
        "Create a free Postgres project at https://neon.tech",
        "Copy the connection string into DATABASE_URL in .env",
      ],
      docker: ["docker compose up -d  # starts local Postgres (DATABASE_URL in .env is pre-filled)"],
      turso: [
        "Local dev works out of the box (TURSO_DATABASE_URL=file:./local.db in .env)",
        "For a hosted DB: install the Turso CLI, run `turso db create`, fill the URL + auth token in .env",
      ],
      supabase: ["Supabase -> Project Settings -> Database -> copy the connection string into DATABASE_URL in .env"],
      other: ["Set DATABASE_URL in .env to your Postgres connection string"],
    }[c.dbProvider ?? "other"];
    steps.push({
      title: `Point ${ormName} at your database`,
      details: [...dbDetails, `${c.pmRunLabel("db:push")}  # push the starter schema to your database`],
    });
  }

  if (c.extras.includes("redis")) {
    steps.push({
      title: "Create an Upstash Redis database (rate limiting / caching)",
      details: [
        "https://console.upstash.com -> Create database",
        "Copy the REST URL + token into .env",
      ],
    });
  }

  if (c.extras.includes("stripe")) {
    steps.push({
      title: "Add your Stripe keys",
      details: [
        "https://dashboard.stripe.com/test/apikeys",
        "Publishable key -> VITE_STRIPE_PUBLISHABLE_KEY in .env.local",
        "Secret key -> STRIPE_SECRET_KEY in .env (server-side only)",
      ],
    });
  }

  if (c.extras.includes("resend")) {
    steps.push({
      title: "Add your Resend API key (transactional email)",
      details: [
        "https://resend.com/api-keys -> Create API key -> RESEND_API_KEY in .env",
        "Email templates live in src/emails/ — send them from your backend",
      ],
    });
  }

  if (c.extras.includes("posthog")) {
    steps.push({
      title: "Connect PostHog analytics (optional)",
      details: ["https://app.posthog.com -> Project Settings -> copy the API key into VITE_POSTHOG_KEY in .env.local"],
    });
  }

  if (c.extras.includes("e2e")) {
    steps.push({
      title: "Install Playwright browsers (one-time, ~100MB)",
      details: [`${c.pmDlxLabel("playwright")} install chromium`, `Then run E2E tests with: ${c.pmRunLabel("test:e2e")}`],
    });
  }

  if (c.extras.includes("deploy")) {
    steps.push({
      title: "Deploy when ready",
      details: [
        "Vercel:  vercel deploy  (vercel.json is configured)",
        "Netlify: netlify deploy  (netlify.toml is configured)",
        `Docker:  docker build -t ${c.name} . && docker run -p 8080:80 ${c.name}`,
      ],
    });
  }

  if (c.ai !== "none") {
    const ai = AI_MODELS[c.ai];
    if (c.backend === "convex") {
      steps.push({
        title: `Set your ${aiLabel(c.ai)} API key on the Convex deployment`,
        details: [
          `Get a key: ${ai.keysUrl}`,
          `${c.pmDlxLabel("convex")} env set ${ai.envKey} <your-key>`,
        ],
      });
    } else {
      steps.push({
        title: `Set ${ai.envKey} in .env.local`,
        details: [
          `Get a key: ${ai.keysUrl}`,
          "See examples/ai.ts — AI calls must run server-side",
        ],
      });
    }
  }

  steps.push({
    title: c.backend === "hono" ? "Start the dev servers (Vite + tRPC API together)" : "Start the dev server",
    details: [`cd ${c.name}`, c.pmRunLabel("dev"), "Open http://localhost:5173"],
  });

  return steps;
}

export function projectReadme(c) {
  const stack = stackList(c);
  const steps = nextSteps(c);

  const stepsMd = steps
    .map((s, i) => {
      const details = s.details.map((d) => (d.startsWith("http") ? d : "```sh\n" + d + "\n```")).join("\n");
      return `### ${i + 1}. ${s.title}\n\n${details}`;
    })
    .join("\n\n");

  const scripts = [
    ["`dev`", c.backend === "convex" ? "Run Vite + Convex dev servers together" : "Start the Vite dev server"],
    ["`build`", "Production build + typecheck"],
    ["`preview`", "Preview the production build locally"],
    ["`lint`", "Run ESLint"],
    ["`typecheck`", "Run TypeScript without emitting"],
  ];
  if (c.backend === "convex") {
    scripts.splice(1, 0, ["`setup`", "One-time Convex login + dev deployment provisioning"]);
  }
  if (c.orm === "drizzle") {
    scripts.push(
      ["`db:generate`", "Generate SQL migrations from the Drizzle schema"],
      ["`db:migrate`", "Apply migrations"],
      ["`db:push`", "Push schema directly to the database (prototyping)"],
      ["`db:studio`", "Open Drizzle Studio"],
    );
  }
  if (c.orm === "prisma") {
    scripts.push(
      ["`db:push`", "Push the Prisma schema to the database"],
      ["`db:generate`", "Regenerate the Prisma client"],
      ["`db:studio`", "Open Prisma Studio"],
    );
  }
  if (c.extras.includes("testing")) {
    scripts.push(["`test`", "Run tests once (Vitest)"], ["`test:watch`", "Run tests in watch mode"]);
  }
  if (c.extras.includes("e2e")) {
    scripts.push(["`test:e2e`", "Run Playwright E2E tests"], ["`test:e2e:ui`", "Playwright interactive UI mode"]);
  }
  if (c.extras.includes("fallow")) {
    scripts.push(
      ["`quality`", "Fallow: dead code + duplication + complexity + health score"],
      ["`quality:audit`", "Fallow: audit only the code you changed (run before a PR)"],
    );
  }
  if (c.extras.includes("knip")) {
    scripts.push(["`knip`", "Find unused files, exports and dependencies"]);
  }
  if (c.extras.includes("prettier")) {
    scripts.push(["`format`", "Format all files with Prettier"]);
  }
  if (c.extras.includes("husky")) {
    scripts.push(["`prepare`", "Set up git hooks (runs automatically on install)"]);
  }

  const structure = [];
  if (c.extras.includes("ci")) structure.push(".github/workflows/ci.yml  # lint + build + test on every push");
  if (c.extras.includes("husky")) structure.push(".husky/               # git hooks (lint-staged on commit)");
  if (c.backend === "hono") structure.push("server/               # Hono + tRPC API server (typed end-to-end)");
  structure.push("src/");
  if (c.router === "tanstack") {
    structure.push("  routes/             # file-based routes (TanStack Router)");
    structure.push("  routeTree.gen.ts    # generated — do not edit");
  }
  structure.push("  components/         # app components");
  structure.push("    ui/               # shadcn/ui components");
  structure.push("  lib/                # utilities" + (c.backend === "supabase" ? " + supabase client" : ""));
  if (c.auth === "supabase-auth") structure.push("  hooks/              # use-session and friends");
  if (c.extras.includes("zustand")) structure.push("  stores/             # zustand stores");
  if (c.extras.includes("testing")) structure.push("  test/               # vitest setup + sample tests");
  structure.push("  main.tsx            # entry: providers are composed here");
  if (c.backend === "convex") {
    structure.push("convex/               # backend functions, schema" + (c.auth !== "none" ? ", auth" : ""));
    structure.push("  _generated/         # generated by `convex dev` — do not edit");
  }
  if (c.orm === "drizzle") {
    structure.push("db/                   # drizzle schema + server-side db client");
    structure.push("drizzle.config.ts");
  }
  if (c.orm === "prisma") structure.push("prisma/               # prisma schema");
  if (c.extras.includes("redis") && c.orm !== "drizzle") structure.push("db/                   # upstash redis + rate limiter (server-side)");
  if (c.dbProvider === "docker") structure.push("docker-compose.yml    # local Postgres 17");
  if (c.secure) {
    const secFile = { bun: "bunfig.toml", pnpm: "pnpm-workspace.yaml", npm: ".npmrc" }[c.pm];
    structure.push(`${secFile.padEnd(22)}# supply-chain protection (7-day package cooldown)`);
  }
  if (c.ai !== "none" && c.backend !== "convex") structure.push("examples/ai.ts        # server-side AI SDK example");

  const docLinks = [
    "- [Vite](https://vite.dev)",
    "- [Tailwind CSS](https://tailwindcss.com/docs)",
    "- [shadcn/ui](https://ui.shadcn.com)",
  ];
  if (c.router === "tanstack") docLinks.push("- [TanStack Router](https://tanstack.com/router)");
  if (c.router === "react-router") docLinks.push("- [React Router](https://reactrouter.com)");
  if (c.backend === "convex") docLinks.push("- [Convex](https://docs.convex.dev)");
  if (c.backend === "supabase") docLinks.push("- [Supabase](https://supabase.com/docs)");
  if (c.backend === "hono") docLinks.push("- [Hono](https://hono.dev)", "- [tRPC](https://trpc.io/docs)");
  if (c.orm === "drizzle") docLinks.push("- [Drizzle ORM](https://orm.drizzle.team)");
  if (c.orm === "prisma") docLinks.push("- [Prisma](https://www.prisma.io/docs)");
  if (c.dbProvider === "neon") docLinks.push("- [Neon](https://neon.com/docs)");
  if (c.dbProvider === "turso") docLinks.push("- [Turso](https://docs.turso.tech)");
  if (c.auth === "clerk") docLinks.push("- [Clerk](https://clerk.com/docs)");
  if (c.auth === "better-auth") docLinks.push("- [Better Auth](https://better-auth.com/docs)", "- [Convex + Better Auth](https://labs.convex.dev/better-auth)");
  if (c.auth === "convex-auth") docLinks.push("- [Convex Auth](https://labs.convex.dev/auth)");
  if (c.extras.includes("redis")) docLinks.push("- [Upstash Redis](https://upstash.com/docs/redis)");
  if (c.ai !== "none") docLinks.push("- [AI SDK](https://ai-sdk.dev/docs)");
  if (c.extras.includes("query")) docLinks.push("- [TanStack Query](https://tanstack.com/query)");
  if (c.extras.includes("table")) docLinks.push("- [TanStack Table](https://tanstack.com/table)");
  if (c.extras.includes("zustand")) docLinks.push("- [Zustand](https://zustand.docs.pmnd.rs)");
  if (c.extras.includes("forms"))
    docLinks.push("- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)");
  if (c.extras.includes("motion")) docLinks.push("- [Motion](https://motion.dev)");
  if (c.extras.includes("dates")) docLinks.push("- [date-fns](https://date-fns.org)");
  if (c.extras.includes("testing"))
    docLinks.push("- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com)");
  if (c.extras.includes("e2e")) docLinks.push("- [Playwright](https://playwright.dev)");
  if (c.extras.includes("fallow")) docLinks.push("- [Fallow](https://docs.fallow.tools)");
  if (c.extras.includes("sentry")) docLinks.push("- [Sentry for React](https://docs.sentry.io/platforms/javascript/guides/react/)");

  return `# ${c.name}

Generated with **create-reactor**.

${stack.map((s) => `\`${s}\``).join(" · ")}

## Getting started

${stepsMd}

## Scripts

| Script | What it does |
| ------ | ------------ |
${scripts.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

Run scripts with \`${c.pmRunLabel("<script>")}\`.

## Project structure

\`\`\`
${structure.join("\n")}
\`\`\`

## Add more UI components

\`\`\`sh
${c.pmDlxLabel("shadcn@latest")} add dialog dropdown-menu table
\`\`\`

Browse all components at https://ui.shadcn.com/docs/components.

## Docs

${docLinks.join("\n")}
`;
}
