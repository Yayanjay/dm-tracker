FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile=false

COPY packages/prisma ./packages/prisma
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

RUN pnpm --filter @dm-tracker/shared build
RUN pnpm --filter @dm-tracker/prisma generate
RUN pnpm --filter @dm-tracker/api build
RUN pnpm --filter @dm-tracker/web build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/prisma ./packages/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/pnpm-workspace.yaml .
COPY --from=builder /app/package.json .

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
