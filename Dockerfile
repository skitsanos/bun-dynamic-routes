# Use the official Bun image
# See all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base

# Set the working directory
WORKDIR /app

# Install dependencies into a temp directory to cache them and speed up future builds
FROM base AS install
WORKDIR /temp/dev
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Install production dependencies (exclude devDependencies)
WORKDIR /temp/prod
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy node_modules from temp directory and project files into the image
FROM base AS prerelease
WORKDIR /app
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .

# [optional] Set environment variables, run tests, and build the project
ENV NODE_ENV=production

# Copy production dependencies and source code into the final image
FROM base AS release
WORKDIR /app
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=prerelease /app/src ./src
COPY --from=prerelease /app/config ./config
COPY --from=prerelease /app/package.json ./
COPY --from=prerelease /app/tsconfig.json ./
COPY --from=prerelease /app/bunfig.toml ./

# Set the user, expose the port, and define the entrypoint
USER bun
EXPOSE 3000
ENTRYPOINT ["bun", "run", "src/index.ts"]
