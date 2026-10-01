/**
 * Minimal Twenty REST client for the relay routes.
 *
 * Notes learned against the self-hosted test instance (v2.43.0, Mac -> Neon us-east-1):
 *  - The link is slow and occasionally answers a *successful* write with the bare string
 *    "Query read timeout". Callers must treat a non-JSON body as unknown, not as failure,
 *    and re-read before retrying a create, or they will duplicate records.
 *  - Composite fields (name, emails, phones, address) take objects, not strings.
 */

const BASE = (process.env.TWENTY_SERVER_URL ?? "").replace(/\/$/, "");

export class TwentyError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function twenty(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.TWENTY_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // "Query read timeout" and friends arrive as a bare string.
    throw new TwentyError(text.slice(0, 200) || "Twenty returned a non-JSON body", 504, text);
  }

  if (!res.ok) {
    const message =
      (body as { message?: string } | null)?.message ?? `Twenty ${res.status}`;
    throw new TwentyError(message, res.status, body);
  }
  return body as Record<string, unknown>;
}

/** REST filter syntax: field[eq]:value */
export async function findOne(object: string, filter: string) {
  const j = (await twenty(`/rest/${object}?filter=${encodeURIComponent(filter)}&limit=1`)) as {
    data?: Record<string, Array<{ id: string }>>;
  };
  const bucket = j?.data ? Object.values(j.data)[0] : undefined;
  return Array.isArray(bucket) ? bucket[0] ?? null : null;
}

export async function createOne(object: string, record: Record<string, unknown>) {
  const j = (await twenty(`/rest/${object}`, {
    method: "POST",
    body: JSON.stringify(record),
  })) as { data?: Record<string, { id: string }> };
  const created = j?.data ? Object.values(j.data)[0] : undefined;
  return created ?? null;
}

export async function updateOne(
  object: string,
  id: string,
  record: Record<string, unknown>
) {
  return twenty(`/rest/${object}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(record),
  });
}

/**
 * Find-then-create, with a re-read if the create's response was lost in a timeout.
 * Without that re-read a timed-out-but-committed create would duplicate on retry.
 */
export async function upsert(
  object: string,
  matchFilter: string,
  record: Record<string, unknown>
): Promise<{ id: string; created: boolean }> {
  const existing = await findOne(object, matchFilter);
  if (existing) {
    await updateOne(object, existing.id, record);
    return { id: existing.id, created: false };
  }
  try {
    const created = await createOne(object, record);
    if (created?.id) return { id: created.id, created: true };
  } catch (err) {
    if (!(err instanceof TwentyError) || err.status !== 504) throw err;
  }
  const recheck = await findOne(object, matchFilter);
  if (recheck) return { id: recheck.id, created: true };
  throw new TwentyError(`Could not create ${object}`, 502, null);
}
