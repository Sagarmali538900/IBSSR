import { cookies } from 'next/headers';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:4001';

export async function fetchBackend(path, options = {}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');

  return fetch(`${backendUrl}${path}`, {
    ...options,
    headers: { ...(cookieHeader ? { cookie: cookieHeader } : {}), ...options.headers },
    cache: 'no-store',
  });
}

export async function fetchBackendJson(path) {
  const response = await fetchBackend(path);
  if (!response.ok) return null;
  return response.json();
}
