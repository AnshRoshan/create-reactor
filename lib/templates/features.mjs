// Feature extras: Stripe, Resend/React Email, PostHog, i18n, PWA, deploy configs,
// Recharts, GSAP, Tiptap, Leaflet.

// ---------------------------------------------------------------------------
// Stripe (payments)
// ---------------------------------------------------------------------------

export function stripeLib() {
  return `import { loadStripe } from "@stripe/stripe-js";

// Stripe.js client — safe for the browser (publishable key only).
// Server-side operations (checkout sessions, webhooks) need STRIPE_SECRET_KEY
// and must run on your backend. See the README's Stripe section.
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);
`;
}

// ---------------------------------------------------------------------------
// Resend + React Email
// ---------------------------------------------------------------------------

export function welcomeEmail(c) {
  return `import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

// Edit this template, then send it server-side with Resend:
//
//   import { Resend } from "resend";
//   const resend = new Resend(process.env.RESEND_API_KEY);
//   await resend.emails.send({
//     from: "you@yourdomain.com",
//     to: user.email,
//     subject: "Welcome!",
//     react: <WelcomeEmail name={user.name} />,
//   });
export function WelcomeEmail({ name = "there" }: { name?: string }) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to ${c.name}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            margin: "40px auto",
            maxWidth: "480px",
            padding: "32px",
          }}
        >
          <Heading style={{ fontSize: "22px" }}>Welcome, {name}!</Heading>
          <Text style={{ color: "#52525b" }}>
            Your ${c.name} account is ready. Jump back in to get started.
          </Text>
          <Button
            href="http://localhost:5173"
            style={{
              backgroundColor: "#18181b",
              borderRadius: "6px",
              color: "#ffffff",
              display: "inline-block",
              padding: "12px 20px",
            }}
          >
            Open the app
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
`;
}

// ---------------------------------------------------------------------------
// PostHog (product analytics)
// ---------------------------------------------------------------------------

export function posthogInit() {
  return `import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY;

// Only initialize when a key is configured (so local dev without PostHog works).
if (key) {
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    defaults: "2025-05-24",
  });
}

export { posthog };
`;
}

// ---------------------------------------------------------------------------
// i18n (react-i18next)
// ---------------------------------------------------------------------------

export function i18nSetup() {
  return `import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Add languages and translations here. Usage in components:
//   const { t, i18n } = useTranslation();
//   <h1>{t("home.title")}</h1>
//   i18n.changeLanguage("es")
const resources = {
  en: {
    translation: {
      home: {
        title: "Welcome",
        subtitle: "Your stack is wired up and ready to build.",
      },
    },
  },
  es: {
    translation: {
      home: {
        title: "Bienvenido",
        subtitle: "Tu stack está configurado y listo para construir.",
      },
    },
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
`;
}

// ---------------------------------------------------------------------------
// Deployment configs
// ---------------------------------------------------------------------------

export function dockerfile(c) {
  const build = {
    bun: `FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install
COPY . .
RUN bun run build`,
    pnpm: `FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install
COPY . .
RUN pnpm run build`,
    npm: `FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install
COPY . .
RUN npm run build`,
  }[c.pm];

  return `# Multi-stage build: compile the app, then serve the static files with nginx.
#   docker build -t ${c.name} .
#   docker run -p 8080:80 ${c.name}
${build}

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}

export function nginxConf() {
  return `server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Single-page app: route everything that isn't a file to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache hashed assets aggressively
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
`;
}

export function dockerignore() {
  return `node_modules
dist
.git
.env
.env.*
*.log
e2e
test-results
playwright-report
`;
}

export function vercelJson() {
  return JSON.stringify(
    {
      $schema: "https://openapi.vercel.sh/vercel.json",
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    },
    null,
    2,
  );
}

export function netlifyToml() {
  return `[build]
  publish = "dist"

# Single-page app: route everything to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
}

// ---------------------------------------------------------------------------
// Recharts (charts demo)
// ---------------------------------------------------------------------------

export function chartDemo() {
  return `import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const data = [
  { month: "Jan", users: 120 },
  { month: "Feb", users: 240 },
  { month: "Mar", users: 380 },
  { month: "Apr", users: 470 },
  { month: "May", users: 690 },
  { month: "Jun", users: 940 },
];

export function ChartDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recharts</CardTitle>
        <CardDescription>
          Edit <code>src/components/chart-demo.tsx</code> to chart your own data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
`;
}

// ---------------------------------------------------------------------------
// GSAP (animation demo)
// ---------------------------------------------------------------------------

export function gsapDemo() {
  return `import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

gsap.registerPlugin(useGSAP);

export function GsapDemo() {
  const container = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: container });

  const replay = contextSafe(() => {
    gsap.fromTo(
      ".gsap-box",
      { y: 24, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, stagger: 0.08, ease: "back.out(1.7)" },
    );
  });

  useGSAP(
    () => {
      replay();
    },
    { scope: container },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>GSAP</CardTitle>
        <CardDescription>
          Staggered entrance animation — see <code>src/components/gsap-demo.tsx</code>.
        </CardDescription>
      </CardHeader>
      <CardContent ref={container} className="flex items-center gap-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="gsap-box bg-primary size-8 rounded-md" />
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={replay}>
          Replay
        </Button>
      </CardContent>
    </Card>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Tiptap (rich text editor demo)
// ---------------------------------------------------------------------------

export function editorDemo() {
  return `import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EditorDemo() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>A rich text editor powered by <strong>Tiptap</strong>. Try <em>bold</em>, lists, headings…</p>",
    editorProps: {
      attributes: {
        class:
          "min-h-28 rounded-md border px-3 py-2 text-sm focus:outline-none [&_p]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiptap editor</CardTitle>
        <CardDescription>
          Headless rich text editing — see <code>src/components/editor-demo.tsx</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EditorContent editor={editor} />
      </CardContent>
    </Card>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Leaflet (maps demo)
// ---------------------------------------------------------------------------

export function mapDemo() {
  return `import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MapDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaflet map</CardTitle>
        <CardDescription>
          OpenStreetMap tiles, no API key needed — see{" "}
          <code>src/components/map-demo.tsx</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MapContainer
          center={[51.505, -0.09]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-64 w-full rounded-md"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker center={[51.505, -0.09]} radius={10}>
            <Popup>Hello from Leaflet!</Popup>
          </CircleMarker>
        </MapContainer>
      </CardContent>
    </Card>
  );
}
`;
}
