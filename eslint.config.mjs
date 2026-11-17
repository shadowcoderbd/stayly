import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Import boundaries from architecture.md §3 / §17.2.
const featureBoundary = {
  group: ["@/features/*/*", "!@/features/*/server"],
  message: "Import features via @/features/<name> or @/features/<name>/server. Inside a feature, use relative imports.",
};
const noAppImports = { group: ["@/app/*"], message: "Nothing imports from app/." };
const noFeatureImports = { group: ["@/features/*"], message: "Shared layers must not depend on features." };
const noHttpInUi = { group: ["axios", "@/lib/http/*"], message: "Components call hooks, never the HTTP layer." };
const noServerInClient = {
  group: ["@/server/*", "@/features/*/server", "drizzle-orm", "drizzle-orm/*", "pg"],
  // DTO types from @/server/modules/<x>/<x>.types are erased at build time, so `import type` is fine.
  allowTypeImports: true,
  message: "Client code can't import server-only modules (only `import type`). Use the feature's api/ + hooks.",
};
const noNextInModules = {
  group: ["next", "next/*", "@/server/lib/api-handler", "@/server/lib/response"],
  message: "Modules don't know about HTTP or Next.js. Take an actor and validated input; let route handlers translate.",
};

// The TS variant understands `allowTypeImports`.
const restrict = (...patterns) => ({ "@typescript-eslint/no-restricted-imports": ["error", { patterns }] });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      ...restrict(featureBoundary, noAppImports),
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    // client side of a feature
    files: ["src/features/*/{hooks,api}/**", "src/features/*/{queries,index,search-params,schemas}.ts"],
    rules: restrict(featureBoundary, noAppImports, noServerInClient),
  },
  {
    files: ["src/features/*/components/**"],
    rules: restrict(featureBoundary, noAppImports, noServerInClient, noHttpInUi),
  },
  {
    files: ["src/server/**"],
    rules: restrict(noAppImports, noFeatureImports),
  },
  {
    // Services, repositories, schemas and types: no HTTP, no Next.js.
    files: ["src/server/modules/**"],
    rules: restrict(noAppImports, noFeatureImports, noNextInModules),
  },
  {
    // Shared by client and server, so no server-only imports.
    files: ["src/{lib,types,hooks,components}/**"],
    rules: restrict(noAppImports, noFeatureImports, noServerInClient),
  },
  {
    // Tests call route handlers directly.
    files: ["test/**"],
    rules: restrict(featureBoundary),
  },
  globalIgnores([".next/**", "out/**", "build/**", "drizzle/**", "data/**", "next-env.d.ts"]),
]);
