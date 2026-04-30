# ── Stage 1: Build TypeScript ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine

# Tectonic version is pinned for reproducibility; update when upgrading.
ARG TECTONIC_VERSION=0.15.0

# curl + tar are needed to fetch the Tectonic binary.
# The musl build is statically linked and works on Alpine with no extra deps.
RUN apk add --no-cache curl tar \
  && curl -sSL \
     "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz" \
     | tar xz -C /usr/local/bin \
  && chmod +x /usr/local/bin/tectonic \
  # Smoke-test: verify Tectonic is executable.
  && tectonic --version

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
