const API = 'http://localhost:3000';

export async function listarAmostras() {
  const r = await fetch(`${API}/amostras`);
  return r.json();
}

export async function criarAmostra(codigo: string) {
  const r = await fetch(`${API}/amostras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo })
  });
  return r.json();
}
