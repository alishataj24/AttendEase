// In production (Vercel), VITE_API_URL is set to '' (empty string) so API calls
// go to the same origin. Locally, it defaults to the local dev server.
const devApiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined &&
  (!import.meta.env.VITE_API_URL.includes('localhost') || import.meta.env.DEV)
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? devApiUrl
      : '';


