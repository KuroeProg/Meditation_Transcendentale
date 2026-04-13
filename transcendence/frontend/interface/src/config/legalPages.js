/**
 * Pages statiques servies par nginx (`transcendence/nginx/legal/` → `/var/www/html/legal/`).
 * En dev, Vite proxy `/legal` vers la même origine que `/api` (voir vite.config.js).
 */
export const LEGAL_PRIVACY_URL = '/legal/privacy.html'
export const LEGAL_TOS_URL = '/legal/tos.html'
export const LEGAL_COOKIES_URL = '/legal/privacy.html#cookies'
