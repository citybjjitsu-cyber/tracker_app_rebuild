const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
const localApiUrl = 'http://127.0.0.1:8000';

// Keep local development pointed at FastAPI while production can use the
// same-origin Vercel proxy without changing the API modules.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_PROXY === 'true'
  ? ''
  : configuredApiUrl || (process.env.NODE_ENV === 'production' ? '' : localApiUrl);

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
