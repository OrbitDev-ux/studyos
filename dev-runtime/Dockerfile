# Study OS Dev — Runtime Backend's own image (§32). NOT the user sandbox —
# see docker/sandbox.Dockerfile for that. This image needs the `docker` CLI
# (node-pty spawns `docker exec -it` locally against the host daemon) and,
# at RUN time via docker-compose, access to the host's Docker socket — never
# baked into the image, and never mounted into a user's own container (§8).
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    docker.io \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build && npm prune --omit=dev

EXPOSE 8088
CMD ["node", "dist/index.js"]
