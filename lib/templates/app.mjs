// React application source files: main.tsx (provider composition), routes/App,
// header, theme toggle, demos and auth UI.

/** Pretty label for the AI provider. */
export function aiLabel(ai) {
  return { anthropic: "Anthropic", openai: "OpenAI", google: "Google" }[ai] ?? "";
}

/** Stack items shown as badges on the home page. */
export function stackList(c) {
  const items = ["React 19", "TypeScript", "Vite", "Tailwind CSS v4", "shadcn/ui"];
  if (c.router === "tanstack") items.push("TanStack Router");
  if (c.router === "react-router") items.push("React Router");
  if (c.backend === "convex") items.push("Convex");
  if (c.backend === "supabase") items.push("Supabase");
  if (c.backend === "hono") items.push("Hono", "tRPC");
  if (c.orm === "drizzle") items.push("Drizzle ORM");
  if (c.orm === "prisma") items.push("Prisma");
  if (c.dbProvider === "neon") items.push("Neon");
  if (c.dbProvider === "turso") items.push("Turso");
  if (c.auth === "clerk") items.push("Clerk");
  if (c.auth === "convex-auth") items.push("Convex Auth");
  if (c.auth === "better-auth") items.push("Better Auth");
  if (c.auth === "supabase-auth") items.push("Supabase Auth");
  if (c.extras.includes("redis")) items.push("Upstash Redis");
  if (c.ai !== "none") items.push(`AI SDK (${aiLabel(c.ai)})`);
  if (c.state === "zustand") items.push("Zustand");
  if (c.state === "jotai") items.push("Jotai");
  if (c.state === "redux") items.push("Redux Toolkit");
  if (c.extras.includes("query")) items.push("TanStack Query");
  if (c.extras.includes("table")) items.push("TanStack Table");
  if (c.extras.includes("forms")) items.push("React Hook Form + Zod");
  if (c.extras.includes("charts")) items.push("Recharts");
  if (c.extras.includes("motion")) items.push("Motion");
  if (c.extras.includes("gsap")) items.push("GSAP");
  if (c.extras.includes("editor")) items.push("Tiptap");
  if (c.extras.includes("maps")) items.push("Leaflet");
  if (c.extras.includes("dates")) items.push("date-fns");
  if (c.extras.includes("nuqs")) items.push("nuqs");
  if (c.extras.includes("stripe")) items.push("Stripe");
  if (c.extras.includes("resend")) items.push("Resend");
  if (c.extras.includes("posthog")) items.push("PostHog");
  if (c.extras.includes("i18n")) items.push("i18next");
  if (c.extras.includes("pwa")) items.push("PWA");
  if (c.extras.includes("testing")) items.push("Vitest");
  if (c.extras.includes("e2e")) items.push("Playwright");
  if (c.extras.includes("sentry")) items.push("Sentry");
  return items;
}

/** Nest JSX wrappers around inner content with indentation. Wrappers: innermost first. */
function nest(inner, wrappers, baseIndent = "  ") {
  let lines = Array.isArray(inner) ? inner : [inner];
  for (const [open, close] of wrappers) {
    lines = [open, ...lines.map((l) => "  " + l), close];
  }
  return lines.map((l) => baseIndent + l).join("\n");
}

/** src/main.tsx — composes providers based on selected features. */
export function mainTsx(c) {
  const imports = [
    `import { StrictMode } from "react";`,
    `import { createRoot } from "react-dom/client";`,
  ];
  const setup = [];

  // Side-effect imports: Sentry first (instruments everything), then analytics/i18n
  if (c.extras.includes("i18n")) {
    imports.unshift(`import "./lib/i18n";`);
  }
  if (c.extras.includes("posthog")) {
    imports.unshift(`import "./lib/posthog";`);
  }
  if (c.extras.includes("sentry")) {
    imports.unshift(`import "./lib/sentry";`);
  }

  // Router imports
  if (c.router === "tanstack") {
    imports.push(`import { RouterProvider, createRouter } from "@tanstack/react-router";`);
    imports.push(`import { routeTree } from "./routeTree.gen";`);
  } else {
    imports.push(`import App from "./App";`);
    if (c.router === "react-router") {
      imports.push(`import { BrowserRouter } from "react-router";`);
    }
  }

  // Backend / auth imports
  if (c.backend === "convex") {
    if (c.auth === "clerk") {
      imports.push(`import { ClerkProvider, useAuth } from "@clerk/clerk-react";`);
      imports.push(`import { ConvexProviderWithClerk } from "convex/react-clerk";`);
      imports.push(`import { ConvexReactClient } from "convex/react";`);
    } else if (c.auth === "convex-auth") {
      imports.push(`import { ConvexAuthProvider } from "@convex-dev/auth/react";`);
      imports.push(`import { ConvexReactClient } from "convex/react";`);
    } else if (c.auth === "better-auth") {
      imports.push(`import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";`);
      imports.push(`import { ConvexReactClient } from "convex/react";`);
      imports.push(`import { authClient } from "@/lib/auth-client";`);
    } else {
      imports.push(`import { ConvexProvider, ConvexReactClient } from "convex/react";`);
    }
  } else if (c.auth === "clerk") {
    imports.push(`import { ClerkProvider } from "@clerk/clerk-react";`);
  }

  // Hono/tRPC: the QueryClient lives in src/lib/trpc.ts next to the typed client
  if (c.backend === "hono") {
    imports.push(`import { QueryClientProvider } from "@tanstack/react-query";`);
    imports.push(`import { queryClient } from "@/lib/trpc";`);
  } else if (c.extras.includes("query")) {
    imports.push(`import { QueryClient, QueryClientProvider } from "@tanstack/react-query";`);
  }

  // Redux needs a Provider; Zustand/Jotai work without one
  if (c.state === "redux") {
    imports.push(`import { Provider as ReduxProvider } from "react-redux";`);
    imports.push(`import { store } from "@/stores/store";`);
  }

  // nuqs: type-safe URL search params adapter
  if (c.extras.includes("nuqs")) {
    imports.push(`import { NuqsAdapter } from "nuqs/adapters/react";`);
  }

  imports.push(`import "./index.css";`);

  // Setup code
  if (c.router === "tanstack") {
    setup.push(`const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}`);
  }
  if (c.backend === "convex") {
    setup.push(`const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);`);
  }
  if (c.auth === "clerk") {
    setup.push(`const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Add VITE_CLERK_PUBLISHABLE_KEY to .env.local (see README)");
}`);
  }
  if (c.backend !== "hono" && c.extras.includes("query")) {
    setup.push(`const queryClient = new QueryClient();`);
  }

  // JSX tree (wrappers listed innermost-first)
  const inner = c.router === "tanstack" ? `<RouterProvider router={router} />` : `<App />`;
  const wrappers = [];

  if (c.router === "react-router") {
    wrappers.push([`<BrowserRouter>`, `</BrowserRouter>`]);
  }
  if (c.extras.includes("nuqs")) {
    wrappers.push([`<NuqsAdapter>`, `</NuqsAdapter>`]);
  }
  if (c.backend === "hono" || c.extras.includes("query")) {
    wrappers.push([`<QueryClientProvider client={queryClient}>`, `</QueryClientProvider>`]);
  }
  if (c.state === "redux") {
    wrappers.push([`<ReduxProvider store={store}>`, `</ReduxProvider>`]);
  }
  if (c.backend === "convex") {
    if (c.auth === "clerk") {
      wrappers.push([
        `<ConvexProviderWithClerk client={convex} useAuth={useAuth}>`,
        `</ConvexProviderWithClerk>`,
      ]);
      wrappers.push([
        `<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">`,
        `</ClerkProvider>`,
      ]);
    } else if (c.auth === "convex-auth") {
      wrappers.push([`<ConvexAuthProvider client={convex}>`, `</ConvexAuthProvider>`]);
    } else if (c.auth === "better-auth") {
      wrappers.push([
        `<ConvexBetterAuthProvider client={convex} authClient={authClient}>`,
        `</ConvexBetterAuthProvider>`,
      ]);
    } else {
      wrappers.push([`<ConvexProvider client={convex}>`, `</ConvexProvider>`]);
    }
  } else if (c.auth === "clerk") {
    wrappers.push([
      `<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">`,
      `</ClerkProvider>`,
    ]);
  }
  wrappers.push([`<StrictMode>`, `</StrictMode>`]);

  return `${imports.join("\n")}

${setup.join("\n\n")}

createRoot(document.getElementById("root")!).render(
${nest(inner, wrappers)},
);
`;
}

const LAYOUT_OPEN = `<div className="bg-background min-h-svh">
      <Header />
      <main className="container mx-auto px-4 py-10">`;
const LAYOUT_CLOSE = `</main>
    </div>`;

/** src/App.tsx — only generated when NOT using TanStack Router. */
export function appTsx(c) {
  if (c.router === "react-router") {
    return `import { Route, Routes } from "react-router";
import { Header } from "@/components/header";
import { Home } from "@/components/home";

function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <p className="text-muted-foreground mt-4">
        Edit this page in <code>src/App.tsx</code>. Add more routes inside the{" "}
        <code>&lt;Routes&gt;</code> element.
      </p>
    </div>
  );
}

export default function App() {
  return (
    ${LAYOUT_OPEN}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      ${LAYOUT_CLOSE}
  );
}
`;
  }
  return `import { Header } from "@/components/header";
import { Home } from "@/components/home";

export default function App() {
  return (
    ${LAYOUT_OPEN}
        <Home />
      ${LAYOUT_CLOSE}
  );
}
`;
}

/** src/routes/__root.tsx (TanStack Router). */
export function rootRoute() {
  return `import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Header } from "@/components/header";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="bg-background min-h-svh">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <Outlet />
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
`;
}

/** src/routes/index.tsx (TanStack Router). */
export function indexRoute() {
  return `import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/home";

export const Route = createFileRoute("/")({
  component: Home,
});
`;
}

/** src/routes/about.tsx (TanStack Router). */
export function aboutRoute() {
  return `import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">About</h1>
      <p className="text-muted-foreground mt-4">
        This page lives at <code>src/routes/about.tsx</code>. Add files to{" "}
        <code>src/routes/</code> and TanStack Router picks them up automatically.
      </p>
    </div>
  );
}
`;
}

/** src/components/header.tsx */
export function header(c) {
  const imports = [`import { Zap } from "lucide-react";`];
  let linkImport = "";
  if (c.router === "tanstack") linkImport = `import { Link } from "@tanstack/react-router";`;
  if (c.router === "react-router") linkImport = `import { Link } from "react-router";`;
  if (linkImport) imports.unshift(linkImport);
  imports.push(`import { ThemeToggle } from "@/components/theme-toggle";`);
  if (c.auth !== "none") imports.push(`import { AuthButtons } from "@/components/auth-buttons";`);

  const brand =
    c.router !== "none"
      ? `<Link to="/" className="flex items-center gap-2 font-semibold">
            <Zap className="size-5" />
            ${c.name}
          </Link>`
      : `<span className="flex items-center gap-2 font-semibold">
            <Zap className="size-5" />
            ${c.name}
          </span>`;

  const navLink = (to, label) =>
    c.router === "tanstack"
      ? `<Link to="${to}" className="hover:text-foreground transition-colors [&.active]:text-foreground">
              ${label}
            </Link>`
      : `<Link to="${to}" className="hover:text-foreground transition-colors">
              ${label}
            </Link>`;

  const nav =
    c.router !== "none"
      ? `
          <nav className="text-muted-foreground flex items-center gap-4 text-sm">
            ${navLink("/", "Home")}
            ${navLink("/about", "About")}
          </nav>`
      : "";

  return `${imports.join("\n")}

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          ${brand}${nav}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />${c.auth !== "none" ? "\n          <AuthButtons />" : ""}
        </div>
      </div>
    </header>
  );
}
`;
}

/** src/components/theme-toggle.tsx */
export function themeToggle() {
  return `import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () =>
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
`;
}

/** src/components/home.tsx — hero, stack badges and feature demos. */
export function home(c) {
  const stack = stackList(c);
  const imports = [
    `import { Badge } from "@/components/ui/badge";`,
    `import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";`,
  ];
  const sections = [];

  if (c.backend === "convex") {
    imports.push(`import { TasksDemo } from "@/components/tasks-demo";`);
    sections.push(`      <TasksDemo />`);
  }
  if (c.auth === "convex-auth" || c.auth === "better-auth") {
    const authName = c.auth === "convex-auth" ? "Convex Auth" : "Better Auth";
    // Both providers propagate auth state through Convex, so the same
    // Authenticated/Unauthenticated helpers work for either.
    imports.unshift(`import { Authenticated, Unauthenticated } from "convex/react";`);
    imports.push(`import { SignInForm } from "@/components/sign-in-form";`);
    sections.push(`      <Unauthenticated>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              ${authName} with email + password. Create an account to try it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm />
          </CardContent>
        </Card>
      </Unauthenticated>
      <Authenticated>
        <Card>
          <CardHeader>
            <CardTitle>Signed in</CardTitle>
            <CardDescription>You are authenticated with ${authName}.</CardDescription>
          </CardHeader>
        </Card>
      </Authenticated>`);
  }
  if (c.backend === "hono") {
    imports.push(`import { TrpcDemo } from "@/components/trpc-demo";`);
    sections.push(`      <TrpcDemo />`);
  }
  if (c.ai !== "none" && c.backend === "convex") {
    // The chat demo needs a server endpoint; Convex HTTP actions provide one.
    imports.push(`import { ChatDemo } from "@/components/chat-demo";`);
    sections.push(`      <ChatDemo />`);
  }
  if (c.extras.includes("table")) {
    imports.push(`import { DataTableDemo } from "@/components/data-table-demo";`);
    sections.push(`      <DataTableDemo />`);
  }
  if (c.extras.includes("charts")) {
    imports.push(`import { ChartDemo } from "@/components/chart-demo";`);
    sections.push(`      <ChartDemo />`);
  }
  if (c.state && c.state !== "none") {
    imports.push(`import { CounterDemo } from "@/components/counter-demo";`);
    sections.push(`      <CounterDemo />`);
  }
  if (c.extras.includes("gsap")) {
    imports.push(`import { GsapDemo } from "@/components/gsap-demo";`);
    sections.push(`      <GsapDemo />`);
  }
  if (c.extras.includes("editor")) {
    imports.push(`import { EditorDemo } from "@/components/editor-demo";`);
    sections.push(`      <EditorDemo />`);
  }
  if (c.extras.includes("maps")) {
    imports.push(`import { MapDemo } from "@/components/map-demo";`);
    sections.push(`      <MapDemo />`);
  }

  return `${imports.join("\n")}

const stack = ${JSON.stringify(stack, null, 2).replace(/\n/g, "\n")};

export function Home() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-4 py-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">${c.name}</h1>
        <p className="text-muted-foreground text-lg">
          Your stack is wired up and ready to build.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {stack.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      </section>
${sections.length ? sections.join("\n") + "\n" : ""}      <Card>
        <CardHeader>
          <CardTitle>Make it yours</CardTitle>
          <CardDescription>Where to go from here.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            • Edit <code className="text-foreground">src/components/home.tsx</code> to change
            this page.
          </p>
          <p>
            • Add shadcn/ui components with{" "}
            <code className="text-foreground">${c.pmDlxLabel("shadcn@latest")} add &lt;component&gt;</code>.
          </p>
          <p>
            • See <code className="text-foreground">README.md</code> for the full setup
            checklist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
`;
}

/** src/components/tasks-demo.tsx (Convex) */
export function tasksDemo(c) {
  return `import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TasksDemo() {
  const tasks = useQuery(api.tasks.get);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convex live query</CardTitle>
        <CardDescription>
          Data from the <code>tasks</code> table — updates in real time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tasks === undefined ? (
          <p className="text-muted-foreground text-sm">
            Waiting for Convex… make sure <code>${c.pmRunLabel("dev")}</code> is running and you
            ran <code>${c.pmRunLabel("setup")}</code> once.
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tasks yet. Import sample data:{" "}
            <code>${c.pmDlxLabel("convex")} import --table tasks sampleData.jsonl</code>
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{task.text}</span>
                <Badge variant={task.isCompleted ? "default" : "outline"}>
                  {task.isCompleted ? "Done" : "Open"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
`;
}

/** src/components/auth-buttons.tsx */
export function authButtons(c) {
  if (c.auth === "clerk") {
    return `import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm">Sign in</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  );
}
`;
  }
  if (c.auth === "convex-auth") {
    return `import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { signOut } = useAuthActions();

  return (
    <Authenticated>
      <Button variant="outline" size="sm" onClick={() => void signOut()}>
        Sign out
      </Button>
    </Authenticated>
  );
}
`;
  }
  if (c.auth === "supabase-auth") {
    return `import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const session = useSession();

  if (session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void supabase.auth.signOut()}
      >
        Sign out
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() =>
        void supabase.auth.signInWithOAuth({ provider: "github" })
      }
    >
      Sign in with GitHub
    </Button>
  );
}
`;
  }
  if (c.auth === "better-auth") {
    return `import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { data: session } = authClient.useSession();

  if (!session) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void authClient.signOut()}
    >
      Sign out
    </Button>
  );
}
`;
  }
  return "";
}

/** src/components/sign-in-form.tsx (Better Auth email + password) */
export function signInFormBetterAuth() {
  return `import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        const formData = new FormData(e.currentTarget);
        const email = String(formData.get("email"));
        const password = String(formData.get("password"));
        const request =
          flow === "signIn"
            ? authClient.signIn.email({ email, password })
            : authClient.signUp.email({
                email,
                password,
                name: email.split("@")[0],
              });
        void request
          .then((result) => {
            if (result.error) {
              setError(result.error.message ?? "Something went wrong");
            }
          })
          .finally(() => setPending(false));
      }}
    >
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="password" type="password" placeholder="Password" required />
      <Button type="submit" disabled={pending}>
        {flow === "signIn" ? "Sign in" : "Sign up"}
      </Button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
`;
}

/** src/components/sign-in-form.tsx (Convex Auth password provider) */
export function signInForm() {
  return `import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        formData.set("flow", flow);
        void signIn("password", formData).catch((err: Error) => {
          setError(err.message);
        });
      }}
    >
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="password" type="password" placeholder="Password" required />
      <Button type="submit">{flow === "signIn" ? "Sign in" : "Sign up"}</Button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
`;
}

/** src/hooks/use-session.ts (Supabase Auth) */
export function useSessionHook() {
  return `import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return session;
}
`;
}

/** src/components/chat-demo.tsx (AI SDK) */
export function chatDemo(c) {
  const endpoint =
    c.backend === "convex"
      ? `// Convex HTTP actions are served from the .site domain
const convexSiteUrl = import.meta.env.VITE_CONVEX_URL.replace(/\\.cloud$/, ".site");
const CHAT_API = \`\${convexSiteUrl}/api/chat\`;`
      : `// TODO: point this at your server endpoint that runs the AI SDK (see README)
const CHAT_API = "/api/chat";`;

  return `import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

${endpoint}

export function ChatDemo() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: CHAT_API }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI chat</CardTitle>
        <CardDescription>
          Streaming chat with the AI SDK (${aiLabel(c.ai)})${c.backend === "convex" ? " via a Convex HTTP action" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 && (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted",
                )}
              >
                {message.parts.map((part, i) =>
                  part.type === "text" ? <span key={i}>{part.text}</span> : null,
                )}
              </div>
            ))}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void sendMessage({ text: input });
            setInput("");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something…"
          />
          <Button type="submit" disabled={status !== "ready"}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
`;
}

/** src/components/counter-demo.tsx + src/stores/counter.ts (Zustand) */
export function counterStore() {
  return `import { create } from "zustand";

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
}));
`;
}

export function counterDemo() {
  return `import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCounterStore } from "@/stores/counter";

export function CounterDemo() {
  const { count, increment, decrement } = useCounterStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zustand store</CardTitle>
        <CardDescription>
          Global state from <code>src/stores/counter.ts</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={decrement}>
          <Minus className="size-4" />
        </Button>
        <span className="min-w-10 text-center text-2xl font-bold tabular-nums">
          {count}
        </span>
        <Button variant="outline" size="icon" onClick={increment}>
          <Plus className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
`;
}
