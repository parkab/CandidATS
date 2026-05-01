const COMPILE_TIMEOUT_MS = 45_000;

export async function compileLatex(latex: string): Promise<Buffer> {
  const serviceUrl = process.env.LATEX_SERVICE_URL;
  const serviceToken = process.env.LATEX_SERVICE_TOKEN;

  if (!serviceUrl || !serviceToken) {
    throw new Error('LATEX_SERVICE_URL and LATEX_SERVICE_TOKEN must be set');
  }

  let response: Response;
  try {
    response = await fetch(`${serviceUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      body: JSON.stringify({ latex }),
      signal: AbortSignal.timeout(COMPILE_TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error';
    throw new Error(`LaTeX service unreachable: ${detail}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200).trim();
    throw new Error(
      `LaTeX service returned ${response.status}${detail ? `: ${detail}` : ''}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
