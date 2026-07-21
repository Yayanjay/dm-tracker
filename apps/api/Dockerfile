FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN corepack enable && pnpm install --frozen-lockfile=false

COPY packages/prisma ./packages/prisma
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm --filter shared build
RUN pnpm --filter prisma generate
RUN pnpm --filter api build

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY pnpm-workspace.yaml package.json ./

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
