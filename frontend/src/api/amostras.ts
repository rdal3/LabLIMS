import { API_BASE_URL } from '../services/api';

export async function listarAmostras() {
  const r = await fetch(`${API_BASE_URL}/amostras`);
  return r.json();
}

export async function criarAmostra(codigo: string) {
  const r = await fetch(`${API_BASE_URL}/amostras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo })
  });
  return r.json();
}
