# syntax=docker/dockerfile:1
# One image recipe, four stages: deps → build → runner (the app) and tools (migrations + seed).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Placeholders so server env validation passes while Next collects page data. Real values come at runtime.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    BETTER_AUTH_URL=$NEXT_PUBLIC_APP_URL \
    pnpm build

# One-shot: apply migrations, then seed demo data when SEED=true (the seed is idempotent).
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY seed ./seed
COPY src ./src
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
ENV NODE_ENV=production UPLOAD_DIR=/data/uploads
CMD ["sh", "-c", "node_modules/.bin/tsx --conditions=react-server scripts/migrate.ts && if [ \"$SEED\" = \"true\" ]; then node_modules/.bin/tsx --conditions=react-server scripts/seed.ts; fi"]

# The app: Next.js standalone output only.
FROM node:22-slim AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
