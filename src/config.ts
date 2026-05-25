// Dynamically resolve the API base URL based on the environment and hostname.
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  
  // If VITE_API_URL is explicitly set and is not localhost, respect it
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // Detect if running on a local development setup (localhost, 127.0.0.1, or local network IP)
  const isLocal = 
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname === '[::1]';

  if (isLocal) {
    return `http://${hostname}:5001`;
  }

  // Deployed production (e.g., Vercel), route requests to the same origin
  return '';
};

export const API_BASE_URL = getApiBaseUrl();



