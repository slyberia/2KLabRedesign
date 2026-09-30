export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** JSON call to the Vercel Functions in ../api. Throws ApiError with the server's message. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(path, {
    method: opts.method ?? "GET",
    credentials: "same-origin",
    headers: opts.body !== undefined ? { "content-type": "application/json" } : {},
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const d = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new ApiError(d.error ?? `HTTP ${r.status}`, r.status);
  return d as T;
}
