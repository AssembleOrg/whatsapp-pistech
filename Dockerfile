FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# Production
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/dist ./dist

# Auth directory permissions - mount path must match Railway volume
RUN mkdir -p /auth_info && chmod 700 /auth_info

ENV NODE_ENV=production
ENV AUTH_DIR=/auth_info

EXPOSE 3000

CMD ["node", "dist/main.js"]
