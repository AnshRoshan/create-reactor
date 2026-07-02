// Extra layers: TanStack Table, Vitest + Testing Library, Motion, Husky, CI, Sentry.
import { fallowCiJob } from "./quality.mjs";

/** src/components/data-table-demo.tsx (TanStack Table + shadcn table) */
export function dataTableDemo() {
  return `import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Person {
  name: string;
  role: string;
  tasks: number;
}

const data: Person[] = [
  { name: "Ada Lovelace", role: "Engineer", tasks: 12 },
  { name: "Grace Hopper", role: "Admiral", tasks: 9 },
  { name: "Alan Turing", role: "Researcher", tasks: 17 },
  { name: "Margaret Hamilton", role: "Director", tasks: 23 },
];

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" className="-ml-3" onClick={onClick}>
      {label}
      <ArrowUpDown className="ml-2 size-3.5" />
    </Button>
  );
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader
        label="Name"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "tasks",
    header: ({ column }) => (
      <SortableHeader
        label="Tasks"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
  },
];

export function DataTableDemo() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>TanStack Table</CardTitle>
        <CardDescription>
          Sortable data table — edit{" "}
          <code>src/components/data-table-demo.tsx</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Vitest + React Testing Library
// ---------------------------------------------------------------------------

/** src/test/setup.ts */
export function testSetup() {
  return `import "@testing-library/jest-dom/vitest";
`;
}

/** src/components/ui/button.test.tsx — sample component test */
export function sampleTest() {
  return `import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with its label", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });
});
`;
}

/** src/lib/utils.test.ts — sample unit test */
export function utilsTest() {
  return `import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "font-bold")).toBe("p-2 font-bold");
  });

  it("resolves Tailwind conflicts (last one wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(cn("base", undefined, null, "extra")).toBe("base extra");
  });
});
`;
}

// ---------------------------------------------------------------------------
// Motion (Framer Motion)
// ---------------------------------------------------------------------------

/** src/components/fade-in.tsx — reusable animation wrapper */
export function fadeIn() {
  return `import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Fades content in from below when it mounts.
 *
 * Usage:
 *   <FadeIn><Card>...</Card></FadeIn>
 *   <FadeIn delay={0.2}>...</FadeIn>
 */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Husky + lint-staged
// ---------------------------------------------------------------------------

/** .husky/pre-commit */
export function huskyPreCommit(c) {
  return `${c.pmDlxLabel("lint-staged")}
`;
}

/** lint-staged config object (merged into package.json). */
export function lintStagedConfig(c) {
  const config = {
    // --no-warn-ignored: lint-staged passes generated files (routeTree.gen.ts,
    // convex/_generated) explicitly; eslint should skip them silently.
    "*.{ts,tsx}": ["eslint --fix --no-warn-ignored"],
  };
  if (c.extras.includes("prettier")) {
    config["*.{ts,tsx,css,md,json}"] = ["prettier --write"];
  }
  return config;
}

// ---------------------------------------------------------------------------
// GitHub Actions CI
// ---------------------------------------------------------------------------

/** .github/workflows/ci.yml */
export function githubCi(c) {
  const setup = {
    bun: `      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile`,
    pnpm: `      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile`,
    npm: `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci`,
  }[c.pm];

  const runCmd = (script) => c.pmRunLabel(script);

  const steps = [
    `      - name: Lint
        run: ${runCmd("lint")}`,
    `      - name: Build & typecheck
        run: ${runCmd("build")}`,
  ];
  if (c.extras.includes("testing")) {
    steps.push(`      - name: Test
        run: ${runCmd("test")}`);
  }

  let e2eJob = "";
  if (c.extras.includes("e2e")) {
    e2eJob = `

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

${setup}

      - name: Install Playwright browsers
        run: ${c.pmDlxLabel("playwright")} install --with-deps chromium

      - name: Run E2E tests
        run: ${runCmd("test:e2e")}

      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14`;
  }

  const fallowJob = c.extras.includes("fallow") ? fallowCiJob() : "";

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

${setup}

${steps.join("\n\n")}${e2eJob}${fallowJob}
`;
}

// ---------------------------------------------------------------------------
// Sentry
// ---------------------------------------------------------------------------

/** src/lib/sentry.ts — error monitoring (only activates when a DSN is set) */
export function sentryInit() {
  return `import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// Only initialize when a DSN is configured (so local dev without Sentry works).
if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
  });
}
`;
}
