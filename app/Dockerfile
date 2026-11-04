# Build from the repository root, where the pnpm workspace lockfile lives:
#   docker build -f app/Dockerfile -t tradepit-app .
FROM node:24-slim AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY app/package.json app/
# better-sqlite3 ships prebuilt binaries for glibc Linux, which is why this is
# Debian slim and not Alpine: the install needs no compiler.
RUN pnpm install --frozen-lockfile --filter app
COPY app ./app
WORKDIR /repo/app
RUN pnpm build
# The standalone server doesn't serve .next/static or public itself, so copy
# them in. Also bundle the seed script, so `node scripts/seed.cjs` runs without
# tsx, and link the traced better-sqlite3 where the bundle can require it.
RUN cp -r .next/static .next/standalone/app/.next/static \
 && if [ -d public ]; then cp -r public .next/standalone/app/public; fi \
 && pnpm exec esbuild scripts/seed.ts --bundle --platform=node --format=cjs \
      --external:better-sqlite3 --outfile=.next/standalone/app/scripts/seed.cjs \
 && cd .next/standalone/app/node_modules \
 && ln -s ../../node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 better-sqlite3

FROM node:24-slim
# HOSTNAME: Docker sets it to the container id, and server.js would bind to that.
# DATABASE_PATH must be absolute: server.js chdirs into its own folder at
# startup, so a relative path silently creates a new, empty database inside the
# image. /data is where the persistent volume goes.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/app.db
WORKDIR /app
COPY --from=build --chown=node:node /repo/app/.next/standalone ./
RUN mkdir /data && chown node:node /data
USER node
WORKDIR /app/app
EXPOSE 3000
CMD ["node", "server.js"]
