import { execFile } from 'child_process';
import express, { NextFunction, Request, Response } from 'express';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const SERVICE_TOKEN = process.env.LATEX_SERVICE_TOKEN;

// Hard limits applied before Tectonic is invoked.
const MAX_INPUT_BYTES = 512 * 1024; // 512 KB — enough for any realistic resume/cover letter
const COMPILE_TIMEOUT_MS = 30_000; // 30 s — kill Tectonic if it hangs

app.use(express.json({ limit: '2mb' }));

function requireToken(req: Request, res: Response, next: NextFunction): void {
  if (!SERVICE_TOKEN) {
    res
      .status(500)
      .json({ error: 'Service misconfigured: LATEX_SERVICE_TOKEN not set' });
    return;
  }
  const token = req.headers['x-service-token'];
  if (typeof token !== 'string' || token !== SERVICE_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.get('/health', (_req: Request, res: Response): void => {
  res.json({ ok: true });
});

app.post(
  '/compile',
  requireToken,
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { latex?: unknown };

    if (typeof body.latex !== 'string' || body.latex.trim().length === 0) {
      res.status(400).json({ error: 'latex must be a non-empty string' });
      return;
    }

    const inputBytes = Buffer.byteLength(body.latex, 'utf8');
    if (inputBytes > MAX_INPUT_BYTES) {
      res
        .status(400)
        .json({ error: `Input too large (max ${MAX_INPUT_BYTES} bytes)` });
      return;
    }

    let tmpDir: string | undefined;

    try {
      tmpDir = await mkdtemp(path.join(tmpdir(), 'latex-'));
      const texFile = path.join(tmpDir, 'document.tex');
      await writeFile(texFile, body.latex, 'utf8');

      const pdfBuffer = await compileTex(texFile, tmpDir);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      console.error('[compile] error:', message);
      res.status(422).json({ error: message });
    } finally {
      if (tmpDir !== undefined) {
        await rm(tmpDir, { recursive: true, force: true }).catch(
          () => undefined,
        );
      }
    }
  },
);

function compileTex(texFile: string, outDir: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const proc = execFile(
      'tectonic',
      // --outdir          — write PDF to our temp dir (not the process cwd)
      // --chatter minimal — suppress progress noise in logs
      ['--outdir', outDir, '--chatter', 'minimal', texFile],
      {
        timeout: COMPILE_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      },
      (error, _stdout, stderr) => {
        if (error) {
          const detail = stderr.slice(0, 500).trim() || error.message;
          reject(new Error(`Tectonic error: ${detail}`));
          return;
        }
        const pdfPath = path.join(outDir, 'document.pdf');
        readFile(pdfPath)
          .then(resolve)
          .catch(() =>
            reject(
              new Error('Tectonic exited successfully but produced no PDF'),
            ),
          );
      },
    );

    proc.on('error', (e) =>
      reject(new Error(`Failed to spawn tectonic: ${e.message}`)),
    );
  });
}

app.listen(PORT, () => {
  console.log(`LaTeX service listening on port ${PORT}`);
});
