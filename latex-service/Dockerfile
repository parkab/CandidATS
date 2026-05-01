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

# Pre-warm Tectonic package cache by compiling a document that uses every
# package in the Jake's Resume / Cover Letter templates. This bakes all
# CTAN package downloads into the image layer so cold starts don't need
# network access to compile the first document.
RUN echo '\documentclass[letterpaper,11pt]{article}' > /tmp/warmup.tex \
  && echo '\usepackage{latexsym}' >> /tmp/warmup.tex \
  && echo '\usepackage[empty]{fullpage}' >> /tmp/warmup.tex \
  && echo '\usepackage{titlesec}' >> /tmp/warmup.tex \
  && echo '\usepackage{marvosym}' >> /tmp/warmup.tex \
  && echo '\usepackage[usenames,dvipsnames]{color}' >> /tmp/warmup.tex \
  && echo '\usepackage{verbatim}' >> /tmp/warmup.tex \
  && echo '\usepackage{enumitem}' >> /tmp/warmup.tex \
  && echo '\usepackage[hidelinks]{hyperref}' >> /tmp/warmup.tex \
  && echo '\usepackage{fancyhdr}' >> /tmp/warmup.tex \
  && echo '\usepackage[english]{babel}' >> /tmp/warmup.tex \
  && echo '\usepackage{tabularx}' >> /tmp/warmup.tex \
  && echo '\ifdefined\pdfglyphtounicode' >> /tmp/warmup.tex \
  && echo '\input{glyphtounicode}' >> /tmp/warmup.tex \
  && echo '\fi' >> /tmp/warmup.tex \
  && echo '\ifdefined\pdfgentounicode' >> /tmp/warmup.tex \
  && echo '\pdfgentounicode=1' >> /tmp/warmup.tex \
  && echo '\fi' >> /tmp/warmup.tex \
  && echo '\begin{document}warmup\end{document}' >> /tmp/warmup.tex \
  && tectonic --chatter minimal /tmp/warmup.tex \
  && rm -f /tmp/warmup.pdf /tmp/warmup.tex

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
