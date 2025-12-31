const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

// --- CONFIGURAÇÃO ---
app.use(cors());
app.use(express.json());

// Conexão com Banco (usando better-sqlite3 pela performance e simplicidade)
const dbPath = path.resolve(__dirname, 'labagua.db');
const db = new Database(dbPath, { verbose: console.log });

// Lista de colunas permitidas para edição (Segurança do server.js)
const ALLOWED_COLUMNS = [
  'codigo', 'cliente', 'pontoColeta', 'matriz', 'dataColeta', 'status', 'observacoes',
  'temperatura', 'ph', 'turbidez', 'condutividade', 'std', 'cloreto', 'cloroResidual',
  'corAparente', 'ferroTotal', 'trihalometanos',
  'coliformesTotais', 'escherichiaColi', 'bacteriasHeterotroficas'
];

// --- MIGRAÇÃO AUTOMÁTICA DE ESQUEMA ---
const migration = () => {
  // 1. Cria tabela com colunas explícitas (Melhor para relatórios futuros)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS amostras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      cliente TEXT,
      pontoColeta TEXT,
      matriz TEXT,
      dataColeta TEXT,
      status TEXT DEFAULT 'Aguardando',
      observacoes TEXT,
      
      -- Físico-Químicos
      temperatura TEXT, ph TEXT, turbidez TEXT, condutividade TEXT, std TEXT, 
      cloreto TEXT, cloroResidual TEXT, corAparente TEXT, ferroTotal TEXT, trihalometanos TEXT,
      
      -- Microbiologia
      coliformesTotais TEXT, escherichiaColi TEXT, bacteriasHeterotroficas TEXT
    )
  `).run();

  // 2. Verifica colunas existentes e adiciona as que faltam (Auto-migração)
  const columns = db.prepare("PRAGMA table_info(amostras)").all();
  const existingColumnNames = columns.map(c => c.name);

  ALLOWED_COLUMNS.forEach(col => {
    if (!existingColumnNames.includes(col)) {
      console.log(`⚠️ Migrando: Adicionando coluna '${col}'...`);
      try {
        db.prepare(`ALTER TABLE amostras ADD COLUMN ${col} TEXT`).run();
      } catch (e) {
        console.error(`Erro ao adicionar ${col}:`, e.message);
      }
    }
  });
};

// Executa migração ao iniciar
migration();

// --- ROTAS ---

// 1. GET TODAS (Com busca inteligente)
app.get('/amostras', (req, res) => {
  try {
    const { busca } = req.query;
    let sql = 'SELECT * FROM amostras';
    const params = [];

    if (busca) {
      sql += ' WHERE (codigo LIKE ? OR cliente LIKE ? OR status LIKE ?)';
      const term = `%${busca}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY id DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET ÚNICA
app.get('/amostras/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM amostras WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Amostra não encontrada' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST (Criar Nova)
app.post('/amostras', (req, res) => {
  try {
    // Pega apenas os dados iniciais comuns
    const { codigo, cliente, pontoColeta, matriz, dataColeta } = req.body;

    const stmt = db.prepare(`
      INSERT INTO amostras (codigo, cliente, pontoColeta, matriz, dataColeta, status)
      VALUES (?, ?, ?, ?, ?, 'Aguardando')
    `);

    const info = stmt.run(codigo, cliente, pontoColeta, matriz, dataColeta);

    res.json({
      id: info.lastInsertRowid,
      codigo,
      msg: 'Amostra criada com sucesso'
    });

  } catch (error) {
    // Tratamento específico para código duplicado
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Já existe uma amostra com este código.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar amostra' });
  }
});

// 4. PATCH (Atualizar qualquer campo permitido)
app.patch('/amostras/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Filtra apenas colunas permitidas (Segurança)
    const keys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));

    if (keys.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }

    const fields = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => updates[key]);
    
    // Adiciona o ID no final dos valores
    values.push(id);

    const stmt = db.prepare(`UPDATE amostras SET ${fields} WHERE id = ?`);
    const info = stmt.run(...values);

    if (info.changes === 0) return res.status(404).json({ error: 'Amostra não encontrada' });

    res.json({ ok: true, changes: info.changes });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar amostra' });
  }
});

// 5. DELETE
app.delete('/amostras/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM amostras WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Amostra não encontrada' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend (Híbrido) rodando em http://localhost:${PORT}`);
});