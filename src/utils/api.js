// Single source of truth for the backend URL.
//
// Override at build/dev time with VITE_API_URL in .env, e.g.:
//   VITE_API_URL=http://216.48.179.252:8000
//
// Falls back to localhost:8000 to match the Vite proxy target in vite.config.js.
//
// Usage:
//   import { API, API_BASE } from '@/utils/api'
//   axios.get(`${API}/projects/`)
//   imageUrl = `${API_BASE}${doc.file_url}`
export const API_BASE = import.meta.env.VITE_API_URL || 'https://apifc.fourreck.com'
export const API = `${API_BASE}/api`
