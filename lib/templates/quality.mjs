// Quality tooling: Playwright E2E, MSW API mocking, Fallow codebase intelligence.

// ---------------------------------------------------------------------------
// Fallow (Rust-native codebase intelligence: dead code, duplication,
// complexity, health score, PR audit — supersedes Knip)
// ---------------------------------------------------------------------------

/** .fallowrc.json — tuned so a fresh starter passes its own quality gate. */
export function fallowConfig(c) {
  // Generated files: never analyze
  const ignorePatterns = [];
  if (c.router === "tanstack") ignorePatterns.push("src/routeTree.gen.ts");
  if (c.backend === "convex") ignorePatterns.push("convex/_generated/**");
  if (c.orm === "prisma") ignorePatterns.push("src/generated/**");
  // shadcn/ui is a vendored component library — its exports are intentional surface
  ignorePatterns.push("src/components/ui/**");

  // Scaffolding the user imports later + files loaded by tools (not import graphs)
  const entry = [];
  if (c.orm === "drizzle") entry.push("db/index.ts");
  if (c.extras.includes("redis")) entry.push("db/redis.ts", "db/ratelimit.ts");
  if (c.extras.includes("testing")) entry.push("src/test/setup.ts");
  if (c.extras.includes("resend")) entry.push("src/emails/*.tsx");
  if (c.extras.includes("motion")) entry.push("src/components/fade-in.tsx");

  // Install-only extras: deps the user will import once they build features
  const ignoreDependencies = [];
  if (c.extras.includes("forms")) ignoreDependencies.push("react-hook-form", "@hookform/resolvers");
  if (c.extras.includes("dates")) ignoreDependencies.push("date-fns");
  if (c.extras.includes("stripe")) ignoreDependencies.push("@stripe/stripe-js");
  if (c.extras.includes("resend")) ignoreDependencies.push("resend");

  const jsonList = (arr) => arr.map((p) => JSON.stringify(p)).join(", ");

  return `{
  "$schema": "https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json",
  "entry": [${jsonList(entry)}],
  "ignorePatterns": [${jsonList(ignorePatterns)}],
  "ignoreDependencies": [${jsonList(ignoreDependencies)}],
  "rules": {
    "unused-files": "error",
    "unused-exports": "warn",
    "unused-dependencies": "warn"
  }
}
`;
}

/** Extra job appended to the CI workflow when Fallow + CI are both selected. */
export function fallowCiJob() {
  return `

  quality:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # full history for changed-code attribution

      # Fallow: dead code, duplication, complexity and PR risk audit.
      # Posts a sticky summary comment + inline review comments on PRs.
      - uses: fallow-rs/fallow@v2
        with:
          command: audit
          comment: true
          review-comments: true`;
}

// ---------------------------------------------------------------------------
// Playwright (E2E)
// ---------------------------------------------------------------------------

export function playwrightConfig(c) {
  // For Convex/Hono backends the dev script starts multiple servers;
  // E2E only needs the frontend.
  const devScript =
    c.backend === "convex" ? "dev:frontend" : c.backend === "hono" ? "dev:web" : "dev";
  return `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "${c.pmRunLabel(devScript)}",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
`;
}

export function playwrightExampleTest(c) {
  return `import { expect, test } from "@playwright/test";

test("home page renders the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("${c.name}");
});

test("theme toggle switches dark mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
`;
}

// ---------------------------------------------------------------------------
// MSW (Mock Service Worker)
// ---------------------------------------------------------------------------

export function mswHandlers() {
  return `import { HttpResponse, http } from "msw";

// Add request handlers here — they intercept fetch/XHR in tests.
// Docs: https://mswjs.io/docs/basics/mocking-responses
export const handlers = [
  http.get("/api/example", () => {
    return HttpResponse.json({ message: "Hello from MSW!" });
  }),
];
`;
}

export function mswServer() {
  return `import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
`;
}

/** src/test/setup.ts — composed based on whether MSW is enabled. */
export function testSetup(c) {
  if (!c.extras.includes("msw")) {
    return `import "@testing-library/jest-dom/vitest";
`;
  }
  return `import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// Start MSW so tests can mock network requests (see src/test/mocks/handlers.ts)
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
`;
}
