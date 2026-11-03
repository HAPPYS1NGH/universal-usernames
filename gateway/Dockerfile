# Build from the repository root, where the pnpm workspace lockfile lives:
#   docker build -f gateway/Dockerfile -t tradepit-gateway .
FROM node:24-alpine AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY gateway/package.json gateway/
RUN pnpm install --frozen-lockfile --prod --filter gateway

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/gateway/node_modules ./gateway/node_modules
COPY gateway/package.json ./gateway/
COPY gateway/src ./gateway/src
WORKDIR /repo/gateway
USER node
EXPOSE 8080
# Node 24 runs the TypeScript sources directly, so there is no build step.
CMD ["node", "src/index.ts"]
