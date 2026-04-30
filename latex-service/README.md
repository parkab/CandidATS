# latex-service

Stateless LaTeX-to-PDF microservice. Accepts a LaTeX source string, compiles it with [Tectonic](https://tectonic-typesetting.github.io/), and returns the raw PDF bytes.

The Next.js app calls this service from the server side. **Browsers never talk to this service directly.**

---

## API

### `GET /health`

Returns `{ "ok": true }`. Used by Railway health checks and the Next.js compile client.

### `POST /compile`

**Headers:**
```
Content-Type: application/json
X-Service-Token: <LATEX_SERVICE_TOKEN>
```

**Body:**
```json
{ "latex": "\\documentclass{article}..." }
```

**Success (200):** `Content-Type: application/pdf` — raw PDF bytes.

**Error (4xx/5xx):** `{ "error": "<message>" }`.

Limits:
- Input max: 512 KB
- Compile timeout: 30 s (SIGKILL after)

---

## Environment variables

| Variable              | Required | Description                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `LATEX_SERVICE_TOKEN` | Yes      | Shared secret; must match `LATEX_SERVICE_TOKEN` in the Next.js app |
| `PORT`                | No       | Listening port (default `3001`)                |

---

## Local development

### Prerequisites

- Docker Desktop

### Build and run

```bash
cd latex-service

# Install deps and generate package-lock.json (first time only)
npm install

# Build the Docker image
docker build -t latex-service .

# Run it
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
  -d '{"latex": "\\documentclass{article}\\begin{document}Hello World\\end{document}"}' \
  --output hello.pdf

open hello.pdf   # macOS
# or: xdg-open hello.pdf  (Linux)
# or: start hello.pdf     (Windows)
```

---

## Railway deployment

1. **Create a new Railway project** and add a new service from this repo.
2. Set the **Root directory** to `latex-service/` in the service settings.
3. Railway will auto-detect the Dockerfile and build it.
4. Add the environment variable `LATEX_SERVICE_TOKEN` to the Railway service.
5. Copy the generated Railway domain (e.g. `https://latex-service-abc123.railway.app`) and set it as `LATEX_SERVICE_URL` in Vercel.
6. Set `LATEX_SERVICE_TOKEN` in Vercel to the **same value** as in Railway.

### Health check

In Railway → Service → Settings → Health checks, set:
- Path: `/health`
- Port: `3001`

---

## Updating Tectonic version

The Tectonic version is pinned in the `Dockerfile` via the `TECTONIC_VERSION` build arg (default `0.15.0`). To upgrade:

1. Find the new release on [GitHub](https://github.com/tectonic-typesetting/tectonic/releases).
2. Update the `ARG TECTONIC_VERSION` line in the Dockerfile.
3. Rebuild and test locally before deploying.

---

## Security notes

- `X-Service-Token` is a shared secret between the Next.js app and this service. Rotate it via environment variables — no redeploy needed.
- Tectonic runs with a hard 30-second SIGKILL timeout to prevent hanging on malformed input.
- Input is capped at 512 KB to prevent resource abuse.
- Error responses truncate stderr to 500 characters to avoid leaking compile internals.
- The service has no filesystem persistence between requests (temp dirs are cleaned up after each compile).
