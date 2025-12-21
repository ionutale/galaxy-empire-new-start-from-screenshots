FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --child-concurrency 1 --network-concurrency 1

COPY . .

RUN pnpm run build


# Build the migration script
RUN pnpm exec esbuild scripts/migrate.ts --bundle --platform=node --external:pg --external:drizzle-orm --outfile=migrate.cjs



RUN CI=true pnpm prune --prod

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/migrate.cjs ./migrate.cjs
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

CMD ["sh", "-c", "node migrate.cjs && node build"]
