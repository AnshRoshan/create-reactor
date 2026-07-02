// Supply-chain security: minimum package release age ("cooldown") per package manager.
//
// Why: the 2025 npm supply-chain attacks (chalk/debug compromise, Shai-Hulud worm)
// were all detected and removed within hours/days of publish. Refusing to install
// brand-new package versions blocks this entire attack class.
//
// Units differ per package manager — do not copy values across:
//   bun  -> seconds  (604800 = 7 days), bunfig.toml,            requires bun >= 1.3
//   pnpm -> minutes  (10080  = 7 days), pnpm-workspace.yaml,    requires pnpm >= 11
//   npm  -> days     (7),               .npmrc,                 requires npm >= 11.10

/** bunfig.toml (bun) */
export function bunfig() {
  return `# Supply-chain protection: only install package versions published at least
# 7 days ago. Malicious package versions are almost always detected and removed
# within hours/days of publish — the cooldown blocks them entirely.
#
# Needs a package that was published today (e.g. an urgent security fix)?
# Add it to the exclusion list below.
#
# Requires bun >= 1.3 — older versions ignore these settings.
[install]
minimumReleaseAge = 604800 # seconds (7 days)
minimumReleaseAgeExcludes = []
`;
}

/** pnpm-workspace.yaml (pnpm) */
export function pnpmWorkspace() {
  return `# Supply-chain protection: only install package versions published at least
# 7 days ago (units: minutes). Malicious package versions are almost always
# detected and removed within hours/days of publish.
#
# Needs a package that was published today? Add it to the exclusion list.
#
# Requires pnpm >= 11 (pnpm 11 defaults to 1 day; this raises it to 7).
minimumReleaseAge: 10080
minimumReleaseAgeExclude: []

# Block a package if its trust level drops compared to earlier releases
trustPolicy: no-downgrade
`;
}

/** .npmrc (npm) */
export function npmrc() {
  return `# Supply-chain protection: only install package versions published at least
# 7 days ago. Requires npm >= 11.10 (older versions ignore this setting).
min-release-age=7

# Stricter (optional): refuse to run dependency postinstall scripts — the top
# malware vector. Uncomment if you want maximum protection; some packages
# (native bindings) may then need: npm rebuild <package>
# ignore-scripts=true
`;
}

/** Returns { filename, content } for the chosen package manager, or null. */
export function securityFile(pm) {
  switch (pm) {
    case "bun":
      return { filename: "bunfig.toml", content: bunfig() };
    case "pnpm":
      return { filename: "pnpm-workspace.yaml", content: pnpmWorkspace() };
    case "npm":
      return { filename: ".npmrc", content: npmrc() };
    default:
      return null;
  }
}
