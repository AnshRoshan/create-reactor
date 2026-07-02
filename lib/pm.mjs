// Package manager detection, command mapping, and process execution helpers.
import { spawnSync } from "node:child_process";

const IS_WIN = process.platform === "win32";

/** Quote an argument for cmd.exe (only when needed). */
function quoteArg(a) {
  if (a === "") return '""';
  if (/^[A-Za-z0-9_\-./@:=+,]+$/.test(a)) return a;
  return '"' + a.replace(/"/g, '""') + '"';
}

/** Run a command, return { ok, stdout, stderr, status }. Never throws. */
export function run(cmd, args, opts = {}) {
  // On Windows we need a shell to resolve .cmd shims (npx, pnpm). Joining the
  // command into a single pre-quoted string avoids Node's DEP0190 warning.
  const spawnCmd = IS_WIN ? [cmd, ...args].map(quoteArg).join(" ") : cmd;
  const spawnArgs = IS_WIN ? undefined : args;
  const res = spawnSync(spawnCmd, spawnArgs, {
    cwd: opts.cwd,
    shell: IS_WIN,
    stdio: opts.interactive ? "inherit" : "pipe",
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", CI: "true", ...opts.env },
    timeout: opts.timeout ?? 10 * 60 * 1000,
  });
  return {
    ok: res.status === 0,
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    error: res.error,
  };
}

/** Check whether a CLI tool exists on PATH. */
export function hasCommand(cmd) {
  const res = run(cmd, ["--version"], { timeout: 15_000 });
  return res.ok;
}

/** Detect which package managers are installed. */
export function detectPackageManagers() {
  const found = [];
  for (const pm of ["bun", "pnpm", "npm"]) {
    if (hasCommand(pm)) found.push(pm);
  }
  return found;
}

/** Command fragments per package manager. */
export const PM = {
  bun: {
    install: ["bun", ["install"]],
    add: (pkgs) => ["bun", ["add", ...pkgs]],
    addDev: (pkgs) => ["bun", ["add", "-d", ...pkgs]],
    // `bun x` rather than `bunx`: the bunx shim doesn't exist in every bun
    // install (e.g. chocolatey on Windows), but `bun x` always works.
    dlx: (pkg, args) => ["bun", ["x", "--bun", pkg, ...args]],
    run: (script) => ["bun", ["run", script]],
    execName: "bun x",
    runLabel: (script) => `bun run ${script}`,
    dlxLabel: (pkg) => `bun x ${pkg}`,
  },
  pnpm: {
    install: ["pnpm", ["install"]],
    add: (pkgs) => ["pnpm", ["add", ...pkgs]],
    addDev: (pkgs) => ["pnpm", ["add", "-D", ...pkgs]],
    dlx: (pkg, args) => ["pnpm", ["dlx", pkg, ...args]],
    run: (script) => ["pnpm", ["run", script]],
    execName: "pnpm dlx",
    runLabel: (script) => `pnpm ${script}`,
    dlxLabel: (pkg) => `pnpm dlx ${pkg}`,
  },
  npm: {
    install: ["npm", ["install"]],
    add: (pkgs) => ["npm", ["install", ...pkgs]],
    addDev: (pkgs) => ["npm", ["install", "-D", ...pkgs]],
    dlx: (pkg, args) => ["npx", ["-y", pkg, ...args]],
    run: (script) => ["npm", ["run", script]],
    execName: "npx",
    runLabel: (script) => `npm run ${script}`,
    dlxLabel: (pkg) => `npx ${pkg}`,
  },
};
