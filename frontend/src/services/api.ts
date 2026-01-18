// Configuração centralizada dos endpoints
// Detecta automaticamente o IP para funcionar no celular
const getApiUrl = () => {
  // Se tiver variável de ambiente, usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Usa o mesmo host que o frontend está rodando (funciona no celular)
  const host = window.location.hostname;
  return `http://${host}:3001`;
};

export const API_BASE_URL = getApiUrl();

export const endpoints = {
  amostras: `${API_BASE_URL}/amostras`,
  dashboard: `${API_BASE_URL}/dashboard`,
  auth: `${API_BASE_URL}/auth`,
  users: `${API_BASE_URL}/users`,
};