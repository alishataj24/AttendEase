// In production (Vercel), VITE_API_URL is set to '' (empty string) so API calls
// go to the same origin. Locally, it defaults to the local dev server.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? 'http://localhost:5001'
      : '';

