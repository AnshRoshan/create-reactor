#!/usr/bin/env node
// create-reactor — interactive generator for modern React projects.
//
// Interactive:      node create-app.mjs
// Non-interactive:  node create-app.mjs my-app --pm bun --backend convex --auth clerk \
//                     --router tanstack --ai anthropic --extras query,zustand --yes
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { PM, detectPackageManagers, run } from "./lib/pm.mjs";
import {
  ALL_EXTRAS,
  DB_PROVIDERS,
  ESSENTIAL_COMPONENTS,
  EXTRAS,
  LINTER_OPTIONS,
  OPTIONAL_COMPONENTS,
  STATE_OPTIONS,
  buildPlan,
  enrichConfig,
  validateConfig,
} from "./lib/build.mjs";
import { PRESETS, PRESET_NAMES } from "./lib/presets.mjs";
import { prismaFallbackSchema, prismaTaskModel } from "./lib/templates/backend.mjs";
import { nextSteps } from "./lib/templates/readme.mjs";

const VALID = {
  pm: ["bun", "pnpm", "npm"],
  preset: PRESET_NAMES,
  backend: ["convex", "supabase", "hono", "none"],
  orm: ["drizzle", "prisma", "none"],
  db: ["neon", "docker", "turso", "supabase", "other"],
  auth: ["clerk", "better-auth", "convex-auth", "supabase-auth", "none"],
  router: ["tanstack", "react-router", "none"],
  ai: ["anthropic", "openai", "google", "none"],
  state: ["zustand", "jotai", "redux", "none"],
  linter: ["eslint", "biome"],
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--no-git") args.git = false;
    else if (a === "--no-install") args.install = false;
    else if (a === "--no-verify") args.verify = false;
    else if (a === "--no-secure") args.secure = false;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
${pc.bold("create-reactor")} — scaffold a modern React app in one command

${pc.bold("Usage:")}
  node create-app.mjs [project-name] [options]

${pc.bold("Options:")}
  --preset <minimal|saas|fullstack|ai|everything|custom>
                                            Start from a preset (flags can override pieces)
  --pm <bun|pnpm|npm>                       Package manager
  --backend <convex|supabase|hono|none>     Backend (hono = Hono + tRPC API server)
  --state <zustand|jotai|redux|none>        State management
  --linter <eslint|biome>                   Linter/formatter (biome = Rust-based, single tool)
  --orm <drizzle|prisma|none>               ORM (non-Convex backends)
  --db <neon|docker|turso|supabase|other>   Database provider (when using an ORM)
  --auth <clerk|better-auth|convex-auth|supabase-auth|none>
  --router <tanstack|react-router|none>     Routing
  --ai <anthropic|openai|google|none>       AI SDK provider
  --components <a,b,c>                      Extra shadcn/ui components
  --extras <a,b,c | all>                    Extra libraries, features & tooling:
                                              query, table, forms, charts, motion, gsap, editor,
                                              maps, dates, nuqs, redis, stripe, resend, posthog,
                                              i18n, pwa, deploy, testing, e2e, msw, storybook,
                                              prettier, husky, ci, sentry, fallow, knip
  --no-secure                               Skip supply-chain protection (7-day package cooldown)
  --no-git                                  Skip git init
  --no-install                              Skip dependency install
  --no-verify                               Skip the verification build
  -y, --yes                                 Accept defaults, no prompts

${pc.bold("Examples:")}
  node create-app.mjs                                          ${pc.dim("# fully interactive")}
  node create-app.mjs my-app --yes                             ${pc.dim("# defaults: bun + convex + clerk + tanstack")}
  node create-app.mjs my-app --backend supabase --orm drizzle --auth supabase-auth --yes
`);
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function unwrap(result) {
  if (p.isCancel(result)) {
    p.cancel("Cancelled — nothing was created.");
    process.exit(0);
  }
  return result;
}

/** Resolve an option: CLI flag wins, then --yes default, then interactive prompt. */
async function resolve(flagValue, validValues, defaultValue, isYes, promptFn) {
  if (flagValue !== undefined) {
    if (!validValues.includes(flagValue)) {
      p.cancel(`Invalid value "${flagValue}". Expected one of: ${validValues.join(", ")}`);
      process.exit(1);
    }
    return flagValue;
  }
  if (isYes) return defaultValue;
  return unwrap(await promptFn());
}

// ---------------------------------------------------------------------------
// Step runner
// ---------------------------------------------------------------------------

function runStep(spinner, label, cmd, args, opts, { fatal = true, retries = 0 } = {}) {
  spinner.start(label);
  let r = run(cmd, args, opts);
  // Retry transient failures (e.g. registry/cache races during installs)
  for (let attempt = 0; !r.ok && attempt < retries; attempt++) {
    spinner.message(`${label} (retry ${attempt + 1}/${retries})`);
    r = run(cmd, args, opts);
  }
  if (r.ok) {
    spinner.stop(`${label} ${pc.green("✓")}`);
    return true;
  }
  spinner.stop(`${label} ${fatal ? pc.red("✗") : pc.yellow("⚠ (skipped)")}`);
  const output = (r.stderr || r.stdout || String(r.error ?? "unknown error"))
    .split("\n")
    .slice(-25)
    .join("\n")
    .trim();
  if (fatal) {
    p.log.error(`Command failed: ${cmd} ${args.join(" ")}\n\n${output}`);
    p.cancel("Aborted. The partially-created project folder was left in place for inspection.");
    process.exit(1);
  } else {
    p.log.warn(`Optional step failed (you can do it manually later):\n  ${cmd} ${args.join(" ")}\n\n${output}`);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (argv.help) {
    printHelp();
    process.exit(0);
  }
  const isYes = Boolean(argv.yes);

  console.log();
  p.intro(pc.bgCyan(pc.black(" create-reactor ")));

  // --- package managers available on this machine
  const detected = detectPackageManagers();
  if (detected.length === 0) {
    p.cancel("No package manager found. Install bun (https://bun.sh), pnpm, or npm first.");
    process.exit(1);
  }

  // --- project name
  let name = argv._[0];
  if (!name && isYes) name = "my-app";
  if (!name) {
    name = unwrap(
      await p.text({
        message: "Project name",
        placeholder: "my-app",
        defaultValue: "my-app",
        validate: (v) => {
          if (v && !/^[a-z0-9][a-z0-9._-]*$/i.test(v)) {
            return "Use letters, numbers, dots, dashes and underscores (no spaces or slashes)";
          }
        },
      }),
    );
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    p.cancel(`Invalid project name "${name}".`);
    process.exit(1);
  }

  // --- target directory
  const targetDir = path.resolve(process.cwd(), name);
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    if (isYes) {
      p.cancel(`Directory ${name}/ already exists and is not empty.`);
      process.exit(1);
    }
    const overwrite = unwrap(
      await p.confirm({
        message: `Directory ${pc.bold(name)}/ already exists and is not empty. Delete it and continue?`,
        initialValue: false,
      }),
    );
    if (!overwrite) {
      p.cancel("Cancelled — nothing was created.");
      process.exit(0);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // --- preset
  let preset = argv.preset;
  if (preset !== undefined && !PRESET_NAMES.includes(preset)) {
    p.cancel(`Invalid preset "${preset}". Valid: ${PRESET_NAMES.join(", ")}`);
    process.exit(1);
  }
  if (!preset) {
    const granularFlags = ["backend", "orm", "db", "auth", "router", "ai", "state", "components", "extras"];
    const hasGranularFlags = granularFlags.some((f) => argv[f] !== undefined);
    if (hasGranularFlags || isYes) {
      preset = "custom";
    } else {
      preset = unwrap(
        await p.select({
          message: "Start from a preset?",
          initialValue: "custom",
          options: PRESET_NAMES.map((key) => ({
            value: key,
            label: PRESETS[key].label,
            hint: PRESETS[key].hint,
          })),
        }),
      );
    }
  }
  const presetConfig = PRESETS[preset]?.config ?? null;

  // --- package manager (always asked, even with a preset)
  const pmDefault = detected.includes("bun") ? "bun" : detected[0];
  const pm = await resolve(argv.pm, VALID.pm, pmDefault, isYes, () =>
    p.select({
      message: "Package manager",
      initialValue: pmDefault,
      options: VALID.pm.map((m) => ({
        value: m,
        label: m,
        hint: detected.includes(m) ? (m === "bun" ? "fastest" : undefined) : "not installed!",
      })),
    }),
  );
  if (!detected.includes(pm)) {
    p.cancel(`${pm} is not installed on this machine. Install it first or pick another package manager.`);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Stack configuration: from the preset, or asked question by question
  // -------------------------------------------------------------------------
  let backend, orm, dbProvider, auth, router, ai, stateLib, linter, components, extras;

  if (presetConfig) {
    // Preset values, individually overridable by CLI flags
    const flagOr = (flagValue, validValues, presetValue) => {
      if (flagValue === undefined) return presetValue;
      if (!validValues.includes(flagValue)) {
        p.cancel(`Invalid value "${flagValue}". Expected one of: ${validValues.join(", ")}`);
        process.exit(1);
      }
      return flagValue;
    };
    backend = flagOr(argv.backend, VALID.backend, presetConfig.backend);
    orm = flagOr(argv.orm, VALID.orm, presetConfig.orm);
    dbProvider = flagOr(argv.db, VALID.db.concat("none"), presetConfig.dbProvider);
    auth = flagOr(argv.auth, VALID.auth, presetConfig.auth);
    router = flagOr(argv.router, VALID.router, presetConfig.router);
    ai = flagOr(argv.ai, VALID.ai, presetConfig.ai);
    stateLib = flagOr(argv.state, VALID.state, presetConfig.state);
    linter = flagOr(argv.linter, VALID.linter, presetConfig.linter ?? "eslint");
    components = [...new Set([...ESSENTIAL_COMPONENTS, ...presetConfig.components])];
    if (argv.components !== undefined) {
      components = [
        ...new Set([
          ...ESSENTIAL_COMPONENTS,
          ...String(argv.components).split(",").map((s) => s.trim()).filter(Boolean),
        ]),
      ];
    }
    extras = presetConfig.extras === "all" ? [...ALL_EXTRAS] : [...presetConfig.extras];
    if (argv.extras !== undefined) {
      const parsed = String(argv.extras).split(",").map((s) => s.trim()).filter(Boolean);
      extras = parsed.includes("all") ? [...ALL_EXTRAS] : parsed;
    }
  } else {
    ({ backend, orm, dbProvider, auth, router, ai, stateLib, linter, components, extras } =
      await askStackQuestions(argv, isYes));
  }

  // Legacy flag support: --extras zustand -> --state zustand
  if (extras.includes("zustand")) {
    extras = extras.filter((e) => e !== "zustand");
    if (!stateLib || stateLib === "none") stateLib = "zustand";
  }

  // The TanStack Table demo is built on the shadcn table component
  if (extras.includes("table") && !components.includes("table")) {
    components.push("table");
  }
  // MSW needs Vitest
  if (extras.includes("msw") && !extras.includes("testing")) {
    extras.push("testing");
  }

  // --- old inline questions moved into askStackQuestions() below
  void 0;
  async function askStackQuestions(argv, isYes) {
  // --- backend
  const backend = await resolve(argv.backend, VALID.backend, "convex", isYes, () =>
    p.select({
      message: "Backend",
      initialValue: "convex",
      options: [
        { value: "convex", label: "Convex", hint: "realtime DB + server functions, zero infra" },
        { value: "supabase", label: "Supabase", hint: "hosted Postgres + auth + storage" },
        { value: "hono", label: "Hono + tRPC", hint: "your own typed API server (Node)" },
        { value: "none", label: "None", hint: "frontend only, add a backend later" },
      ],
    }),
  );

  // --- ORM (not applicable to Convex — it has its own database)
  let orm = "none";
  if (backend !== "convex") {
    const ormDefault = backend === "none" ? "none" : "drizzle";
    orm = await resolve(argv.orm, VALID.orm, ormDefault, isYes, () =>
      p.select({
        message: "ORM for your database",
        initialValue: ormDefault,
        options: [
          { value: "drizzle", label: "Drizzle ORM", hint: "lightweight, SQL-like, fast" },
          { value: "prisma", label: "Prisma", hint: "schema-first, rich tooling" },
          { value: "none", label: "None", hint: backend === "supabase" ? "use the Supabase JS client only" : "no database" },
        ],
      }),
    );
  } else if (argv.orm && argv.orm !== "none") {
    p.log.warn("Ignoring --orm: Convex has its own database, Drizzle/Prisma don't apply.");
  }

  // --- database provider (only when an ORM was chosen)
  let dbProvider = "none";
  if (orm !== "none") {
    if (backend === "supabase") {
      // The Supabase project IS the Postgres database
      dbProvider = "supabase";
    } else {
      const validProviders = DB_PROVIDERS[orm];
      const providerOptions = [
        { value: "neon", label: "Neon", hint: "serverless Postgres, generous free tier" },
        { value: "docker", label: "Local Postgres (Docker)", hint: "docker-compose.yml included" },
        ...(orm === "drizzle"
          ? [{ value: "turso", label: "Turso", hint: "SQLite at the edge (libSQL)" }]
          : []),
        { value: "other", label: "Other Postgres", hint: "any DATABASE_URL (Railway, RDS, ...)" },
      ];
      dbProvider = await resolve(argv.db, validProviders, "neon", isYes, () =>
        p.select({
          message: "Database provider",
          initialValue: "neon",
          options: providerOptions,
        }),
      );
    }
  } else if (argv.db) {
    p.log.warn("Ignoring --db: a database provider only applies when an ORM is selected.");
  }

  // --- auth
  const authOptions = {
    convex: [
      { value: "clerk", label: "Clerk", hint: "hosted auth UI, integrates natively with Convex" },
      { value: "better-auth", label: "Better Auth", hint: "open-source, self-hosted, fastest-growing" },
      { value: "convex-auth", label: "Convex Auth", hint: "built into Convex, no third-party account" },
      { value: "none", label: "None", hint: "add auth later" },
    ],
    supabase: [
      { value: "supabase-auth", label: "Supabase Auth", hint: "built into Supabase" },
      { value: "clerk", label: "Clerk", hint: "hosted auth UI" },
      { value: "none", label: "None", hint: "add auth later" },
    ],
    hono: [
      { value: "clerk", label: "Clerk", hint: "hosted auth UI" },
      { value: "none", label: "None", hint: "add auth later" },
    ],
    none: [
      { value: "clerk", label: "Clerk", hint: "hosted auth UI" },
      { value: "none", label: "None", hint: "add auth later" },
    ],
  }[backend];
  const authDefault = authOptions[0].value;
  const auth = await resolve(argv.auth, VALID.auth, authDefault, isYes, () =>
    p.select({
      message: "Authentication",
      initialValue: authDefault,
      options: authOptions,
    }),
  );

  // --- router
  const router = await resolve(argv.router, VALID.router, "tanstack", isYes, () =>
    p.select({
      message: "Routing",
      initialValue: "tanstack",
      options: [
        { value: "tanstack", label: "TanStack Router", hint: "type-safe, file-based routes" },
        { value: "react-router", label: "React Router", hint: "classic declarative routing" },
        { value: "none", label: "None", hint: "single page, add routing later" },
      ],
    }),
  );

  // --- state management
  const stateLib = await resolve(argv.state, VALID.state, "none", isYes, () =>
    p.select({
      message: "State management",
      initialValue: "zustand",
      options: STATE_OPTIONS,
    }),
  );

  // --- linter / formatter
  const linter = await resolve(argv.linter, VALID.linter, "eslint", isYes, () =>
    p.select({
      message: "Linter & formatter",
      initialValue: "eslint",
      options: LINTER_OPTIONS,
    }),
  );

  // --- shadcn components
  let components;
  if (argv.components !== undefined) {
    components = String(argv.components).split(",").map((s) => s.trim()).filter(Boolean);
  } else if (isYes) {
    components = ["label", "dialog", "sonner"];
  } else {
    components = unwrap(
      await p.multiselect({
        message: `shadcn/ui components (${ESSENTIAL_COMPONENTS.join(", ")} are always included)`,
        options: OPTIONAL_COMPONENTS.map((comp) => ({ value: comp, label: comp })),
        initialValues: ["label", "dialog", "sonner"],
        required: false,
      }),
    );
  }
  components = [...new Set([...ESSENTIAL_COMPONENTS, ...components])];

  // --- AI SDK
  const ai = await resolve(argv.ai, VALID.ai, "none", isYes, () =>
    p.select({
      message: "AI SDK (Vercel) — LLM chat + text generation",
      initialValue: "none",
      options: [
        { value: "none", label: "Skip" },
        { value: "anthropic", label: "Anthropic (Claude)" },
        { value: "openai", label: "OpenAI (GPT)" },
        { value: "google", label: "Google (Gemini)" },
      ],
    }),
  );

  // --- extras (app libraries + tooling), asked as two grouped multiselects
  let extras;
  if (argv.extras !== undefined) {
    extras = String(argv.extras).split(",").map((s) => s.trim()).filter(Boolean);
    if (extras.includes("all")) {
      extras = [...ALL_EXTRAS];
    } else {
      const bad = extras.filter((e) => !ALL_EXTRAS.includes(e));
      if (bad.length) {
        p.cancel(`Invalid extras: ${bad.join(", ")}. Valid: all, ${ALL_EXTRAS.join(", ")}`);
        process.exit(1);
      }
    }
  } else if (isYes) {
    extras = [];
  } else {
    const libraries = unwrap(
      await p.multiselect({
        message: "App libraries",
        options: EXTRAS.libraries,
        initialValues: ["query"],
        required: false,
      }),
    );
    const tooling = unwrap(
      await p.multiselect({
        message: "Tooling & quality",
        options: EXTRAS.tooling,
        initialValues: ["testing", "prettier"],
        required: false,
      }),
    );
    extras = [...libraries, ...tooling];
  }

  return { backend, orm, dbProvider, auth, router, ai, stateLib, linter, components, extras };
  }

  // --- git / install / security
  const git = argv.git !== false && (isYes || argv.git === true || unwrap(await p.confirm({ message: "Initialize a git repository?", initialValue: true })));
  const install = argv.install !== false && (isYes || argv.install === true || unwrap(await p.confirm({ message: "Install dependencies now?", initialValue: true })));
  const verify = argv.verify !== false;
  const secure = argv.secure !== false;

  // --- assemble + validate config
  const config = enrichConfig({
    name,
    pm,
    backend,
    orm,
    dbProvider,
    auth,
    router,
    ai,
    state: stateLib ?? "none",
    linter: linter ?? "eslint",
    components,
    extras,
    secure,
    git,
    install,
  });
  const err = validateConfig(config);
  if (err) {
    p.cancel(err);
    process.exit(1);
  }

  // --- summary
  const dbProviderLabels = {
    neon: "Neon (serverless Postgres)",
    docker: "Local Postgres (Docker)",
    turso: "Turso (SQLite)",
    supabase: "Supabase Postgres",
    other: "Other Postgres",
    none: "None",
  };
  const summary = [
    ["Project", name],
    ["Folder", targetDir],
    ...(preset !== "custom" ? [["Preset", PRESETS[preset].label]] : []),
    ["Package manager", pm],
    ["Backend", { convex: "Convex", supabase: "Supabase", hono: "Hono + tRPC", none: "None" }[backend]],
    ...(backend !== "convex" ? [["ORM", { drizzle: "Drizzle ORM", prisma: "Prisma", none: "None" }[orm]]] : []),
    ...(orm !== "none" ? [["Database", dbProviderLabels[dbProvider]]] : []),
    ["Auth", { clerk: "Clerk", "better-auth": "Better Auth", "convex-auth": "Convex Auth", "supabase-auth": "Supabase Auth", none: "None" }[auth]],
    ["Routing", { tanstack: "TanStack Router", "react-router": "React Router", none: "None" }[router]],
    ["State", { zustand: "Zustand", jotai: "Jotai", redux: "Redux Toolkit", none: "None" }[stateLib ?? "none"]],
    ["Linting", { eslint: "ESLint" + (extras.includes("prettier") ? " + Prettier" : ""), biome: "Biome (Rust)" }[linter ?? "eslint"]],
    ["UI", `Tailwind v4 + shadcn/ui (${components.join(", ")})`],
    ["AI SDK", { anthropic: "Anthropic (Claude)", openai: "OpenAI (GPT)", google: "Google (Gemini)", none: "None" }[ai]],
    ["Extras", extras.length ? extras.join(", ") : "None"],
    ["Security", secure ? "7-day package cooldown (supply-chain protection)" : pc.yellow("disabled (--no-secure)")],
  ];
  p.note(summary.map(([k, v]) => `${pc.dim(k.padEnd(17))}${v}`).join("\n"), "Your stack");

  if (!isYes) {
    const ok = unwrap(await p.confirm({ message: "Create the project?", initialValue: true }));
    if (!ok) {
      p.cancel("Cancelled — nothing was created.");
      process.exit(0);
    }
  }

  // -------------------------------------------------------------------------
  // Execute
  // -------------------------------------------------------------------------
  const plan = buildPlan(config);
  const pmc = PM[pm];
  const spinner = p.spinner();

  // 1. write files
  spinner.start("Writing project files");
  for (const [rel, content] of plan.files) {
    const abs = path.join(targetDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
  }
  spinner.stop(`Wrote ${plan.files.size} files ${pc.green("✓")}`);

  // 2. git init early — Husky's prepare script needs an existing repo
  let gitInitialized = false;
  if (git) {
    gitInitialized = run("git", ["init"], { cwd: targetDir }).ok;
    if (!gitInitialized) {
      p.log.warn("git init failed — continuing without a repository.");
    }
  }

  if (install) {
    // 2. install dependencies (1 retry: registry hiccups and metadata-cache races are transient)
    const [addCmd, addArgs] = pmc.add(plan.deps);
    runStep(spinner, `Installing ${plan.deps.length} dependencies (${pm})`, addCmd, addArgs, { cwd: targetDir }, { retries: 1 });

    const [devCmd, devArgs] = pmc.addDev(plan.devDeps);
    runStep(spinner, `Installing ${plan.devDeps.length} dev dependencies (${pm})`, devCmd, devArgs, { cwd: targetDir }, { retries: 1 });

    // 3. shadcn/ui components (CLI fetches from registry + installs radix deps)
    const [shadCmd, shadArgs] = pmc.dlx("shadcn@latest", ["add", ...components, "--yes", "--overwrite"]);
    runStep(spinner, `Adding ${components.length} shadcn/ui components`, shadCmd, shadArgs, { cwd: targetDir }, { fatal: false });

    // 4. prisma init (matches whatever Prisma version was installed)
    if (orm === "prisma") {
      const [priCmd, priArgs] = pmc.dlx("prisma", ["init", "--datasource-provider", "postgresql"]);
      runStep(spinner, "Initializing Prisma", priCmd, priArgs, { cwd: targetDir }, { fatal: false });
      const schemaPath = path.join(targetDir, "prisma", "schema.prisma");
      if (fs.existsSync(schemaPath)) {
        fs.appendFileSync(schemaPath, prismaTaskModel(), "utf8");
      } else {
        fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
        fs.writeFileSync(schemaPath, prismaFallbackSchema(), "utf8");
      }
    }

    // 4b. Storybook (its own CLI sets up .storybook/, stories and deps)
    if (extras.includes("storybook")) {
      const [sbCmd, sbArgs] = pmc.dlx("storybook@latest", ["init", "--yes", "--no-dev"]);
      runStep(spinner, "Setting up Storybook (this one takes a while)", sbCmd, sbArgs, { cwd: targetDir }, { fatal: false });
    }

    // 5. husky git hooks (needs the repo from step 2 + husky installed by step 3)
    if (extras.includes("husky") && gitInitialized) {
      // Add the prepare script now — putting it in package.json before install
      // would make the install itself fail (husky doesn't exist yet at that point).
      const pkgPath = path.join(targetDir, "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.scripts = { ...pkg.scripts, prepare: "husky" };
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

      const [prepCmd, prepArgs] = pmc.run("prepare");
      runStep(spinner, "Setting up git hooks (husky)", prepCmd, prepArgs, { cwd: targetDir }, { fatal: false });
    }

    // 6. verification: build (+ tests when selected)
    if (verify) {
      const [buildCmd, buildArgs] = pmc.run("build");
      const ok = runStep(spinner, "Verifying the project builds", buildCmd, buildArgs, { cwd: targetDir }, { fatal: false });
      if (ok) {
        // clean up build output, keep the project pristine
        fs.rmSync(path.join(targetDir, "dist"), { recursive: true, force: true });
      }
      if (extras.includes("testing")) {
        const [testCmd, testArgs] = pmc.run("test");
        runStep(spinner, "Running the sample tests", testCmd, testArgs, { cwd: targetDir }, { fatal: false });
      }
    }
  } else if (orm === "prisma") {
    // no install -> write the fallback schema so the project is complete
    const schemaPath = path.join(targetDir, "prisma", "schema.prisma");
    fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
    fs.writeFileSync(schemaPath, prismaFallbackSchema(), "utf8");
  }

  // 7. initial commit
  if (gitInitialized) {
    spinner.start("Creating initial commit");
    run("git", ["add", "-A"], { cwd: targetDir });
    // Fall back to a local identity so the initial commit works even when
    // git has no global user.name/user.email configured.
    const hasIdentity = run("git", ["config", "user.email"], { cwd: targetDir }).ok;
    const idFlags = hasIdentity
      ? []
      : ["-c", "user.name=create-reactor", "-c", "user.email=create-reactor@localhost"];
    const gitOk = run("git", [...idFlags, "commit", "-m", "Initial commit from create-reactor"], { cwd: targetDir }).ok;
    spinner.stop(gitOk ? `Created git repository + initial commit ${pc.green("✓")}` : `Initial commit ${pc.yellow("⚠")} skipped (repo is initialized — commit manually)`);
  }

  // -------------------------------------------------------------------------
  // Next steps
  // -------------------------------------------------------------------------
  const steps = nextSteps(config);
  const stepsText = steps
    .map((s, i) => `${pc.bold(`${i + 1}. ${s.title}`)}\n${s.details.map((d) => `   ${pc.cyan(d)}`).join("\n")}`)
    .join("\n\n");
  p.note(stepsText, "Next steps");

  p.outro(`${pc.green("Done!")} Project created at ${pc.bold(targetDir)} — full checklist in its README.md`);
}

main().catch((err) => {
  p.log.error(String(err?.stack ?? err));
  process.exit(1);
});
