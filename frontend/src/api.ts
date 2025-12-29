const API_URL = 'http://localhost:3000';

export async function listarAmostras() {
  const res = await fetch(`${API_URL}/amostras`);
  return res.json();
}

export async function criarAmostra(payload: {
  codigo: string;
  data_coleta: string;
}) {
  const res = await fetch(`${API_URL}/amostras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
