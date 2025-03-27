FROM node:22.13.1-alpine3.20 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

# Enable corepack to use pnpm
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

#------------------#

FROM base AS build

RUN apk add --no-cache g++ make python3

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=$PNPM_HOME/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

#------------------#

FROM base AS release

RUN apk add --no-cache ffmpeg
RUN apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community yt-dlp

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=$PNPM_HOME/store pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist

# TODO: Create `entrypoint.sh` that updates `yt-dlp` on startup
CMD ["node", "dist/index.js"]
