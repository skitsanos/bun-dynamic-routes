# Use the official Bun image
# See all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /app

# Install production dependencies only. The previous dev-dependency stage was
# never used by the final image - nothing is built at image time - so it only
# cost build time and cache space.
FROM base AS install
WORKDIR /temp/prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Assemble the runtime image
FROM base AS release
WORKDIR /app

ENV NODE_ENV=production

COPY --from=install /temp/prod/node_modules ./node_modules
COPY src ./src
COPY public ./public
COPY config ./config
COPY package.json tsconfig.json bunfig.toml ./

# Writable location for uploads, owned by the unprivileged runtime user
RUN mkdir -p /app/uploads && chown -R bun:bun /app/uploads

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun --eval "fetch('http://127.0.0.1:'+(process.env.PORT??3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["bun", "run", "src/index.ts"]
