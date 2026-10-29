'use client';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let csrfToken: string | null = null;
export const setCsrf = (t: string | null) => {
  csrfToken = t;
};

/** Same-origin API client. Mutations carry the session's CSRF token. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(method !== 'GET' && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  if (!res.ok || !json.ok) throw new ApiError(res.status, json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}
