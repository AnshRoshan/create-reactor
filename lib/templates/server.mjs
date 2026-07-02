// Hono + tRPC v11 backend: a small typed API server living in server/,
// consumed by the Vite SPA through @trpc/tanstack-react-query.

/** server/router.ts — the tRPC router (this is where the API lives). */
export function trpcRouter() {
  return `import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

/** Building blocks for your API — use these to add more routers/procedures. @public */
export const router = t.router;
/** @public */
export const publicProcedure = t.procedure;

export const appRouter = router({
  hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
    return { greeting: \`Hello \${input ?? "World"}!\` };
  }),

  // Example list endpoint — replace with real data (database, external API, ...)
  list: publicProcedure.query(() => {
    return [
      { id: 1, name: "Ada Lovelace" },
      { id: 2, name: "Grace Hopper" },
      { id: 3, name: "Alan Turing" },
    ];
  }),
});

export type AppRouter = typeof appRouter;
`;
}

/** server/index.ts — Hono server hosting the tRPC router. */
export function honoServer() {
  return `import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appRouter } from "./router";

const app = new Hono();

// CORS must be registered BEFORE the tRPC middleware.
// Tighten the origin list before deploying.
app.use(
  "/trpc/*",
  cors({
    origin: "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
  }),
);

const port = 3001;
serve({ fetch: app.fetch, port });
console.log(\`tRPC server running on http://localhost:\${port}/trpc\`);
`;
}

/** src/lib/trpc.ts — typed client + TanStack Query integration. */
export function trpcClient() {
  return `import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../../server/router";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "http://localhost:3001/trpc" })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
`;
}

/** src/components/trpc-demo.tsx — demo card calling the tRPC API. */
export function trpcDemo(c) {
  return `import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TrpcDemo() {
  const hello = useQuery(trpc.hello.queryOptions("tRPC"));
  const list = useQuery(trpc.list.queryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>tRPC API</CardTitle>
        <CardDescription>
          End-to-end typed API from <code>server/router.ts</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hello.isError ? (
          <p className="text-muted-foreground text-sm">
            Could not reach the API server. Start everything with{" "}
            <code>${c.pmRunLabel("dev")}</code> (runs Vite + the tRPC server together).
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {hello.isPending ? "Loading…" : hello.data.greeting}
            </p>
            <div className="flex flex-wrap gap-2">
              {list.data?.map((person) => (
                <Badge key={person.id} variant="secondary">
                  {person.name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
`;
}
