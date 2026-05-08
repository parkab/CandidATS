# latex-service

Stateless LaTeX-to-PDF microservice. Accepts a LaTeX source string, compiles it with [Tectonic](https://tectonic-typesetting.github.io/), and returns the raw PDF bytes.

The Next.js app calls this service from the server side via `LATEX_SERVICE_URL`. **Browsers never talk to this service directly.**

Deployed on [Fly.io](https://fly.io) (pay-as-you-go, scales to zero when idle). Designed to be portable — the Dockerfile works unchanged on AWS App Runner, ECS, or any container platform.

---

## Architecture

```
Browser → Next.js app (Vercel)
               ↓  POST /compile  (server-side only)
         LaTeX service (Fly.io)
               ↓
           Tectonic → PDF bytes → response
```

---

## API

### `GET /health`

Returns `{ "ok": true }`. Used by the Fly.io health check and the Next.js compile client.

### `POST /compile`

**Headers:**
```
Content-Type: application/json
X-Service-Token: <LATEX_SERVICE_TOKEN>
```

**Body:**
```json
{ "latex": "\\documentclass{article}\\begin{document}Hello\\end{document}" }
```

**Success (200):** `Content-Type: application/pdf` — raw PDF bytes.

**Error (4xx/5xx):** `{ "error": "<message>" }`.

Limits:
- Input max: 512 KB
- Compile timeout: 30 s (SIGKILL after)

---

## Environment variables

| Variable              | Where set          | Description                                    |
| --------------------- | ------------------ | ---------------------------------------------- |
| `LATEX_SERVICE_TOKEN` | Fly.io secret      | Shared secret; must match the value in Vercel  |
| `PORT`                | `fly.toml` `[env]` | Listening port (default `3001`, already set)   |

The Next.js app needs these two variables (set in Vercel):

| Variable              | Example value                            |
| --------------------- | ---------------------------------------- |
| `LATEX_SERVICE_URL`   | `https://candid-ats-latex.fly.dev`       |
| `LATEX_SERVICE_TOKEN` | same random secret as the Fly.io secret  |

---

## Local development

### Prerequisites

- Docker Desktop

### Build and run

```bash
# From the repo root
docker build -t latex-service ./latex-service

# Run (replace the token value with anything for local dev)
docker run --rm -p 3001:3001 \
  -e LATEX_SERVICE_TOKEN=dev-secret \
  latex-service
```

### Smoke test

```bash
# Health check
curl http://localhost:3001/health

# Compile a minimal document
curl -X POST http://localhost:3001/compile \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: dev-secret" \
  -d '{"latex":"\\documentclass{article}\\begin{document}Hello World\\end{document}"}' \
  --output hello.pdf

open hello.pdf       # macOS
xdg-open hello.pdf   # Linux
start hello.pdf      # Windows (PowerShell)
```

---

## Fly.io deployment

### 1. Install flyctl

```bash
# macOS
brew install flyctl

# Linux / WSL
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Log in

```bash
flyctl auth login
```

### 3. Create the app

```bash
# Run from the latex-service/ directory.
# Pick a name that is globally unique on Fly.io.
cd latex-service
flyctl apps create candid-ats-latex
```

Then open `fly.toml` and confirm the `app` field matches the name you just created.

### 4. Set the shared secret

Generate a strong random token and save it somewhere secure (you'll need the same value in Vercel):

```bash
# Generate a token (macOS/Linux)
openssl rand -hex 32

# Set it as a Fly.io secret (still inside latex-service/)
flyctl secrets set LATEX_SERVICE_TOKEN=<paste-token-here>
```

### 5. Deploy

```bash
# Still inside latex-service/
flyctl deploy
```

Fly.io builds the Docker image remotely, pushes it, and starts the machine. The first deploy takes ~3 minutes. Watch the logs with:

```bash
flyctl logs
```

### 6. Verify

```bash
# Get your app URL
flyctl status

# Health check
curl https://candid-ats-latex.fly.dev/health
# → {"ok":true}

# Smoke test
curl -X POST https://candid-ats-latex.fly.dev/compile \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: <your-token>" \
  -d '{"latex":"\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output test.pdf
```

### 7. Set Vercel environment variables

In your Vercel project → Settings → Environment Variables, add:

| Name                  | Value                                          |
| --------------------- | ---------------------------------------------- |
| `LATEX_SERVICE_URL`   | `https://candid-ats-latex.fly.dev`             |
| `LATEX_SERVICE_TOKEN` | the same token you set in step 4               |

Redeploy the Vercel app after adding these.

---

## CI/CD with GitHub Actions

Add a deploy step to your workflow so every merge to `main` redeploys the service:

```yaml
- name: Setup flyctl
  uses: superfly/flyctl-actions/setup-flyctl@master

- name: Deploy LaTeX service to Fly.io
  run: flyctl deploy --remote-only
  working-directory: latex-service
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Add `FLY_API_TOKEN` to your GitHub repo secrets:

```bash
flyctl tokens create deploy -x 999999h
# Copy the token → GitHub → Settings → Secrets → Actions → New secret
```

---

## Cold start behaviour

With `min_machines_running = 0`, the Fly.io machine stops after ~5 minutes of inactivity. The first request after a stop wakes the machine (typically 1–3 seconds). The first *compile* after a full machine restart is slower (5–15 s) because Tectonic downloads missing TeX packages from the internet. Subsequent compiles on a running machine are fast (<2 s).

If cold-start latency is unacceptable, set `min_machines_running = 1` in `fly.toml` to keep one machine always running (~$3.40/mo for 512 MB shared-1x).

---

## Migrating to AWS

The service is a standard Docker container with no Fly.io-specific dependencies. To migrate:

1. Push the image to Amazon ECR: `docker build ./latex-service | docker tag latex-service <ecr-url>; docker push`
2. Deploy on **AWS App Runner** (simplest), **ECS Fargate**, or **Elastic Beanstalk**
3. Set `LATEX_SERVICE_TOKEN` as a secret in the AWS service config
4. Update `LATEX_SERVICE_URL` in Vercel to the new AWS endpoint
5. Delete `fly.toml` or keep it as a fallback

---

## Updating Tectonic

The Tectonic version is pinned via the `ARG TECTONIC_VERSION` in the Dockerfile (default `0.15.0`). To upgrade:

1. Find the new release on [GitHub](https://github.com/tectonic-typesetting/tectonic/releases).
2. Update `ARG TECTONIC_VERSION=<new-version>` in `Dockerfile`.
3. Build and smoke-test locally before deploying: `docker build -t latex-service . && <smoke test above>`.
4. Deploy: `flyctl deploy`.

---

## Security

- `X-Service-Token` is a shared secret between the Next.js app and this service. Rotate it by running `flyctl secrets set LATEX_SERVICE_TOKEN=<new-value>` and updating the Vercel env var — no redeploy needed.
- Tectonic runs with a hard 30-second SIGKILL timeout to prevent hanging on malformed input.
- Input is capped at 512 KB to prevent resource abuse.
- Error responses truncate stderr to 500 characters to avoid leaking compile internals.
- The service has no filesystem persistence between requests (temp dirs are cleaned up after each compile).
