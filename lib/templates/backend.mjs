// Backend files: Convex functions/schema/auth, Supabase client, Drizzle, Prisma, AI SDK.

export const AI_MODELS = {
  anthropic: {
    pkg: "@ai-sdk/anthropic",
    importName: "anthropic",
    model: "claude-sonnet-4-6",
    envKey: "ANTHROPIC_API_KEY",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    pkg: "@ai-sdk/openai",
    importName: "openai",
    model: "gpt-5.1",
    envKey: "OPENAI_API_KEY",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  google: {
    pkg: "@ai-sdk/google",
    importName: "google",
    model: "gemini-2.5-flash",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    keysUrl: "https://aistudio.google.com/apikey",
  },
};

// ---------------------------------------------------------------------------
// Convex
// ---------------------------------------------------------------------------

export function convexTsconfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        allowJs: true,
        strict: true,
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        target: "ESNext",
        lib: ["ES2021", "dom"],
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        isolatedModules: true,
        noEmit: true,
      },
      include: ["./**/*"],
      exclude: ["./_generated"],
    },
    null,
    2,
  );
}

export function convexSchema(c) {
  const authImport =
    c.auth === "convex-auth" ? `import { authTables } from "@convex-dev/auth/server";\n` : "";
  const authSpread = c.auth === "convex-auth" ? "  ...authTables,\n" : "";
  return `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
${authImport}
export default defineSchema({
${authSpread}  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
  }),
});
`;
}

export function convexTasks() {
  return `import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      text: args.text,
      isCompleted: false,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");
    await ctx.db.patch(args.id, { isCompleted: !task.isCompleted });
  },
});
`;
}

export function convexSampleData() {
  return `{"text": "Scaffold this project", "isCompleted": true}
{"text": "Run the dev server", "isCompleted": true}
{"text": "Build something great", "isCompleted": false}
`;
}

/** convex/auth.config.ts — only when auth is wired through Convex. */
export function convexAuthConfig(c) {
  if (c.auth === "clerk") {
    return `export default {
  providers: [
    {
      // Set CLERK_JWT_ISSUER_DOMAIN on your Convex deployment:
      //   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
      // (find it in Clerk Dashboard -> JWT templates -> "convex" -> Issuer)
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
`;
  }
  if (c.auth === "convex-auth") {
    return `export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
`;
  }
  if (c.auth === "better-auth") {
    return `import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";

export default {
  providers: [getAuthConfigProvider()],
};
`;
  }
  return "";
}

/** convex/auth.ts (Convex Auth). */
export function convexAuthTs() {
  return `import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
`;
}

/** convex/http.ts — composed from auth routes (Convex Auth / Better Auth) and/or the AI chat route. */
export function convexHttp(c) {
  const needsAuth = c.auth === "convex-auth" || c.auth === "better-auth";
  const needsChat = c.ai !== "none";
  if (!needsAuth && !needsChat) return "";

  const imports = [`import { httpRouter } from "convex/server";`];
  if (c.auth === "convex-auth") imports.push(`import { auth } from "./auth";`);
  if (c.auth === "better-auth") imports.push(`import { authComponent, createAuth } from "./auth";`);
  if (needsChat) imports.push(`import { chat, chatOptions } from "./chat";`);

  const routes = [];
  if (c.auth === "convex-auth") routes.push(`auth.addHttpRoutes(http);`);
  if (c.auth === "better-auth") routes.push(`authComponent.registerRoutes(http, createAuth, { cors: true });`);
  if (needsChat) {
    routes.push(`http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: chatOptions,
});`);
  }

  return `${imports.join("\n")}

const http = httpRouter();

${routes.join("\n\n")}

export default http;
`;
}

/** convex/chat.ts — AI SDK streaming chat as a Convex HTTP action. */
export function convexChat(c) {
  const ai = AI_MODELS[c.ai];
  return `import { ${ai.importName} } from "${ai.pkg}";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { httpAction } from "./_generated/server";

// CORS headers let the Vite dev server (a different origin) call this endpoint.
// Tighten Access-Control-Allow-Origin before going to production.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const chat = httpAction(async (_ctx, request) => {
  // Requires ${ai.envKey} on your Convex deployment:
  //   npx convex env set ${ai.envKey} <your-key>
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: ${ai.importName}("${ai.model}"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ headers: corsHeaders });
});

export const chatOptions = httpAction(async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
});
`;
}

// ---------------------------------------------------------------------------
// Convex _generated stubs
//
// Written at scaffold time so the project typechecks and builds immediately.
// `convex dev` regenerates these with the same shape on first run.
// ---------------------------------------------------------------------------

/** List of convex function modules for the api stub. */
function convexModules(c) {
  const modules = ["tasks"];
  if (c.auth === "convex-auth") modules.push("auth");
  if (c.ai !== "none") modules.push("chat", "http");
  else if (c.auth === "convex-auth") modules.push("http");
  return [...new Set(modules)].sort();
}

export function convexGeneratedApiDts(c) {
  const modules = convexModules(c);
  return `/* eslint-disable */
/**
 * Generated \`api\` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\`.
 */
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
${modules.map((m) => `import type * as ${m} from "../${m}.js";`).join("\n")}

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * \`\`\`js
 * const myFunctionReference = api.myModule.myFunction;
 * \`\`\`
 */
declare const fullApi: ApiFromModules<{
${modules.map((m) => `  ${m}: typeof ${m};`).join("\n")}
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
`;
}

export function convexGeneratedApiJs() {
  return `/* eslint-disable */
/**
 * Generated \`api\` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\`.
 */
import { anyApi } from "convex/server";

export const api = anyApi;
export const internal = anyApi;
`;
}

export function convexGeneratedDataModelDts() {
  return `/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\`.
 */
import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
} from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema.js";

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;

/**
 * A type describing your Convex data model.
 */
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
`;
}

export function convexGeneratedServerDts() {
  return `/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\`.
 */
import {
  ActionBuilder,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

export declare const query: QueryBuilder<DataModel, "public">;
export declare const internalQuery: QueryBuilder<DataModel, "internal">;
export declare const mutation: MutationBuilder<DataModel, "public">;
export declare const internalMutation: MutationBuilder<DataModel, "internal">;
export declare const action: ActionBuilder<DataModel, "public">;
export declare const internalAction: ActionBuilder<DataModel, "internal">;
export declare const httpAction: HttpActionBuilder;

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;
`;
}

export function convexGeneratedServerJs() {
  return `/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run \`npx convex dev\`.
 */
import {
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
} from "convex/server";

export const query = queryGeneric;
export const internalQuery = internalQueryGeneric;
export const mutation = mutationGeneric;
export const internalMutation = internalMutationGeneric;
export const action = actionGeneric;
export const internalAction = internalActionGeneric;
export const httpAction = httpActionGeneric;
`;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export function supabaseClient() {
  return `import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
`;
}

// ---------------------------------------------------------------------------
// Drizzle (provider-aware: neon | turso | docker | supabase | other)
// ---------------------------------------------------------------------------

export function drizzleConfig(c) {
  if (c.dbProvider === "turso") {
    return `import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
`;
  }
  return `import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;
}

export function drizzleSchema(c) {
  if (c.dbProvider === "turso") {
    return `import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
`;
  }
  return `import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
`;
}

export function drizzleIndex(c) {
  const header = `// Server-side only — never import this from browser code.
// Use it from scripts, API routes, or server functions.`;
  if (c.dbProvider === "neon") {
    return `${header}
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql, schema });
`;
  }
  if (c.dbProvider === "turso") {
    return `${header}
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const db = drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  schema,
});
`;
  }
  // docker / supabase / other -> standard postgres.js driver
  return `${header}
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });
`;
}

/** Runtime deps for the chosen drizzle provider (dotenv is a devDep — only configs use it). */
export function drizzleDeps(c) {
  const deps = ["drizzle-orm"];
  if (c.dbProvider === "neon") deps.push("@neondatabase/serverless");
  else if (c.dbProvider === "turso") deps.push("@libsql/client");
  else deps.push("postgres");
  return deps;
}

// ---------------------------------------------------------------------------
// Local Postgres via Docker
// ---------------------------------------------------------------------------

export function dockerCompose(c) {
  return `services:
  postgres:
    image: postgres:17
    container_name: ${c.name}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${c.name.replace(/[^a-z0-9_]/gi, "_")}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
`;
}

// ---------------------------------------------------------------------------
// Upstash Redis (serverless Redis: rate limiting, caching, sessions)
// ---------------------------------------------------------------------------

export function upstashRedis() {
  return `// Server-side only — the REST token grants full database access.
// Use from scripts, API routes, or server functions, never from browser code.
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
`;
}

export function upstashRatelimit() {
  return `import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Allow 10 requests per 10 seconds per identifier (IP, user id, ...).
// Usage:
//   const { success } = await ratelimit.limit(identifier);
//   if (!success) return new Response("Too many requests", { status: 429 });
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
`;
}

// ---------------------------------------------------------------------------
// Better Auth (via the official Convex component)
// ---------------------------------------------------------------------------

/** convex/convex.config.ts — registers the Better Auth component. */
export function convexConfigBetterAuth() {
  return `import betterAuth from "@convex-dev/better-auth/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);

export default app;
`;
}

/** convex/auth.ts (Better Auth flavor). */
export function convexBetterAuthTs() {
  return `import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => authComponent.getAuthUser(ctx),
});
`;
}

/** src/lib/auth-client.ts (Better Auth React client). */
export function betterAuthClient() {
  return `import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient()],
});
`;
}

// ---------------------------------------------------------------------------
// Prisma (fallback schema if `prisma init` is unavailable)
// ---------------------------------------------------------------------------

export function prismaTaskModel() {
  return `
model Task {
  id          Int      @id @default(autoincrement())
  text        String
  isCompleted Boolean  @default(false)
  createdAt   DateTime @default(now())
}
`;
}

export function prismaFallbackSchema() {
  return `// Prisma schema — docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
${prismaTaskModel()}`;
}

// ---------------------------------------------------------------------------
// AI SDK (no Convex backend) — server-side example
// ---------------------------------------------------------------------------

export function aiExample(c) {
  const ai = AI_MODELS[c.ai];
  return `// Example: generating text with the AI SDK (${ai.pkg}).
//
// IMPORTANT: AI provider calls must run on a server (Node script, API route,
// edge function, Convex action, ...). Never expose ${ai.envKey} to the browser.
//
// Try it:
//   1. Set ${ai.envKey} in .env.local
//   2. Run: npx tsx --env-file=.env.local examples/ai.ts

import { ${ai.importName} } from "${ai.pkg}";
import { generateText } from "ai";

const { text } = await generateText({
  model: ${ai.importName}("${ai.model}"),
  prompt: "Write a haiku about React.",
});

console.log(text);
`;
}
