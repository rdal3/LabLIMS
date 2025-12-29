const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database('labagua.db');

// Tabela mínima
db.prepare(`
  CREATE TABLE IF NOT EXISTS amostras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL,
    data_coleta TEXT,
    status TEXT DEFAULT 'Pendente',
    params TEXT,
    micro TEXT
  )
`).run();

// GET todas
app.get('/amostras', (req, res) => {
  const rows = db.prepare('SELECT * FROM amostras').all();
  res.json(rows.map(r => ({
    ...r,
    params: r.params ? JSON.parse(r.params) : {},
    micro: r.micro ? JSON.parse(r.micro) : {}
  })));
});

// POST nova
app.post('/amostras', (req, res) => {
  const { codigo, data_coleta } = req.body;

  const result = db.prepare(`
    INSERT INTO amostras (codigo, data_coleta, params, micro)
    VALUES (?, ?, ?, ?)
  `).run(
    codigo,
    data_coleta || null,
    JSON.stringify({}),
    JSON.stringify({})
  );

  res.json({
    id: result.lastInsertRowid,
    codigo,
    data_coleta,
    status: 'Pendente',
    params: {},
    micro: {}
  });
});

// PUT atualizar
app.put('/amostras/:id', (req, res) => {
  const { id } = req.params;
  const { status, params, micro } = req.body;

  db.prepare(`
    UPDATE amostras
    SET status = ?, params = ?, micro = ?
    WHERE id = ?
  `).run(
    status,
    JSON.stringify(params || {}),
    JSON.stringify(micro || {}),
    id
  );

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('🔥 Backend rodando em http://localhost:3000');
});
