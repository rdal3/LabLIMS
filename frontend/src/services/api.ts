// Configuração centralizada dos endpoints
// Usar variável de ambiente em produção
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const endpoints = {
  amostras: `${API_BASE_URL}/amostras`,
  dashboard: `${API_BASE_URL}/dashboard`,
  auth: `${API_BASE_URL}/auth`,
  users: `${API_BASE_URL}/users`,
};