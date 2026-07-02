// Biome: Rust-based linter + formatter, replaces ESLint + Prettier with one tool.

export function biomeJson(c) {
  // Note: output is pre-formatted exactly the way Biome's own formatter wants it
  // (inline short arrays, trailing newline), so `biome check` passes on its own config.
  const ignores = [];
  if (c.backend === "convex") ignores.push("!convex/_generated/**");
  if (c.router === "tanstack") ignores.push("!src/routeTree.gen.ts");
  if (c.orm === "prisma") ignores.push("!src/generated/**");
  const includes = ["**", ...ignores].map((i) => JSON.stringify(i)).join(", ");

  return `{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": [${includes}]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
`;
}

/** Linter-specific package.json scripts. */
export function linterScripts(c) {
  if (c.linter === "biome") {
    return {
      lint: "biome check .",
      "lint:fix": "biome check --write .",
      format: "biome format --write .",
    };
  }
  // eslint (+ prettier handled separately as an extra)
  const scripts = { lint: "eslint ." };
  if (c.extras.includes("prettier")) {
    scripts.format = "prettier --write .";
  }
  return scripts;
}

/** Linter-specific dev dependencies. */
export function linterDevDeps(c) {
  if (c.linter === "biome") {
    return ["@biomejs/biome"];
  }
  const deps = [
    "eslint",
    "@eslint/js",
    "typescript-eslint",
    "eslint-plugin-react-hooks",
    "eslint-plugin-react-refresh",
    "globals",
  ];
  if (c.extras.includes("prettier")) {
    deps.push("prettier", "prettier-plugin-tailwindcss");
  }
  return deps;
}

/** lint-staged config per linter. */
export function linterLintStaged(c) {
  if (c.linter === "biome") {
    return {
      "*.{ts,tsx,js,jsx,json,css}": ["biome check --write --no-errors-on-unmatched"],
    };
  }
  const config = {
    "*.{ts,tsx}": ["eslint --fix --no-warn-ignored"],
  };
  if (c.extras.includes("prettier")) {
    config["*.{ts,tsx,css,md,json}"] = ["prettier --write"];
  }
  return config;
}
