const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001; 

// Middlewares
app.use(cors());
app.use(express.json());

// --- CONEXÃO COM O BANCO REAL (labagua.db) ---
const dbPath = path.resolve(__dirname, 'labagua.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar no labagua.db:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite (labagua.db)');
  }
});

// --- CRIAÇÃO E MIGRAÇÃO DA TABELA ---
// Essa parte garante que o banco antigo funcione com o código novo
db.serialize(() => {
  // 1. Cria a tabela padrão se não existir
  db.run(`CREATE TABLE IF NOT EXISTS amostras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    cliente TEXT,
    pontoColeta TEXT,
    matriz TEXT,
    dataColeta TEXT,
    status TEXT DEFAULT 'Aguardando',
    observacoes TEXT,
    
    -- Parâmetros Físico-Químicos
    temperatura TEXT,
    ph TEXT,
    turbidez TEXT,
    condutividade TEXT,
    std TEXT,
    cloreto TEXT,
    cloroResidual TEXT,
    corAparente TEXT,
    ferroTotal TEXT,
    trihalometanos TEXT,
    
    -- Microbiologia
    coliformesTotais TEXT,
    escherichiaColi TEXT,
    bacteriasHeterotroficas TEXT
  )`);

  // 2. AUTO-MIGRAÇÃO: Verifica e cria colunas que faltam no seu banco antigo
  const COLUNAS_NECESSARIAS = [
      'cliente', 'pontoColeta', 'matriz', 'dataColeta', 'status', 'observacoes',
      'temperatura', 'ph', 'turbidez', 'condutividade', 'std', 'cloreto', 'cloroResidual',
      'corAparente', 'ferroTotal', 'trihalometanos',
      'coliformesTotais', 'escherichiaColi', 'bacteriasHeterotroficas'
  ];

  db.all("PRAGMA table_info(amostras)", (err, rows) => {
      if (err) return console.error("Erro ao ler esquema do banco:", err);
      
      const colunasExistentes = rows.map(r => r.name);
      
      COLUNAS_NECESSARIAS.forEach(col => {
          if (!colunasExistentes.includes(col)) {
              console.log(`⚠️ Migrando banco: Adicionando coluna faltante '${col}'...`);
              db.run(`ALTER TABLE amostras ADD COLUMN ${col} TEXT`, (err) => {
                  if (err) console.error(`Erro ao adicionar coluna ${col}:`, err.message);
              });
          }
      });
  });
});

// LISTA DE COLUNAS PERMITIDAS PARA EDIÇÃO (Segurança)
const ALLOWED_COLUMNS = [
    'codigo', 'cliente', 'pontoColeta', 'matriz', 'dataColeta', 'status', 'observacoes',
    'temperatura', 'ph', 'turbidez', 'condutividade', 'std', 'cloreto', 'cloroResidual',
    'corAparente', 'ferroTotal', 'trihalometanos',
    'coliformesTotais', 'escherichiaColi', 'bacteriasHeterotroficas'
];

// --- ROTAS DA API ---

// 1. LISTAR TODAS (GET)
app.get('/amostras', (req, res) => {
  db.all("SELECT * FROM amostras ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 2. BUSCAR UMA (GET)
app.get('/amostras/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM amostras WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Amostra não encontrada" });
    res.json(row);
  });
});

// 3. CRIAR NOVA (POST)
app.post('/amostras', (req, res) => {
  const { codigo, cliente, pontoColeta, matriz, dataColeta, status } = req.body;
  
  const query = `
    INSERT INTO amostras (codigo, cliente, pontoColeta, matriz, dataColeta, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [codigo, cliente, pontoColeta, matriz, dataColeta, status || 'Aguardando'], function(err) {
    if (err) {
        console.error("Erro no INSERT:", err.message);
        return res.status(400).json({ error: err.message });
    }
    res.json({ 
      id: this.lastID, 
      codigo, 
      status: status || 'Aguardando',
      msg: "Criado com sucesso no SQLite" 
    });
  });
});

// 4. ATUALIZAR / LANÇAR RESULTADOS (PATCH)
app.patch('/amostras/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  console.log(`📝 Recebido PATCH para ID ${id}:`, updates);

  if (Array.isArray(updates)) {
      return res.status(400).json({ error: "Envie um objeto JSON, não um array." });
  }

  // Filtra apenas colunas permitidas
  const keys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));
  
  if (keys.length === 0) {
      return res.status(400).json({ error: "Nenhum dado válido para atualizar." });
  }

  const fields = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => updates[key]);
  
  const query = `UPDATE amostras SET ${fields} WHERE id = ?`;
  
  db.run(query, [...values, id], function(err) {
    if (err) {
        console.error("❌ Erro SQL (Provavelmente coluna faltando):", err.message);
        return res.status(500).json({ error: "Erro no banco: " + err.message });
    }
    if (this.changes === 0) return res.status(404).json({ error: "Amostra não encontrada" });
    
    res.json({ message: "Atualizado com sucesso", changes: this.changes });
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend Real rodando em http://localhost:${PORT}`);
});