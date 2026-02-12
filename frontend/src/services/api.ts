// Configuração centralizada dos endpoints
// FIX: Forçando path relativo para funcionar com Cloudflare Tunnel (Single Domain)
// Isso elimina problemas de CORS e necessidade de VITE_API_URL no build
export const API_BASE_URL = '/api';

export const endpoints = {
  amostras: `${API_BASE_URL}/amostras`,
  dashboard: `${API_BASE_URL}/dashboard`,
  auth: `${API_BASE_URL}/auth`,
  users: `${API_BASE_URL}/users`,
};