FROM oven/bun:1.3.6 AS base
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["bun", "dev"]

FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "start"]
