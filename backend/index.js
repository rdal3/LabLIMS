const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();

// 1. Configuração de CORS
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Conexão com Banco
const db = new Database('labagua.db', { verbose: console.log });

// --- MIGRAÇÃO AUTOMÁTICA DE ESQUEMA ---
// Garante que a tabela exista e tenha todas as colunas necessárias
const migration = () => {
  // 1. Cria tabela base se não existir
  db.prepare(`
    CREATE TABLE IF NOT EXISTS amostras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL,
      cliente TEXT,
      pontoColeta TEXT,
      matriz TEXT,
      data_coleta TEXT,
      status TEXT DEFAULT 'Pendente',
      params TEXT,
      micro TEXT
    )
  `).run();

  // 2. Verifica colunas existentes para adicionar as que faltam (caso o banco já exista)
  const columns = db.prepare("PRAGMA table_info(amostras)").all();
  const columnNames = columns.map(c => c.name);

  const neededColumns = ['cliente', 'pontoColeta', 'matriz'];
  
  neededColumns.forEach(col => {
    if (!columnNames.includes(col)) {
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

// GET todas (COM FILTROS E ORDENAÇÃO)
app.get('/amostras', (req, res) => {
  try {
    const { busca, ordem } = req.query;

    let sql = 'SELECT * FROM amostras';
    const queryParams = [];

    if (busca) {
      // Busca expandida para incluir Cliente
      sql += ' WHERE (codigo LIKE ? OR status LIKE ? OR cliente LIKE ?)';
      const term = `%${busca}%`;
      queryParams.push(term, term, term);
    }

    const direcao = (ordem && ordem.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    sql += ` ORDER BY id ${direcao}`;

    const rows = db.prepare(sql).all(...queryParams);

    res.json(rows.map(r => ({
      ...r,
      params: r.params ? JSON.parse(r.params) : {},
      micro: r.micro ? JSON.parse(r.micro) : {}
    })));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar amostras' });
  }
});

// GET UMA ÚNICA AMOSTRA
app.get('/amostras/:id', (req, res) => {
  const { id } = req.params;
  try {
    const row = db.prepare('SELECT * FROM amostras WHERE id = ?').get(id);

    if (!row) {
      return res.status(404).json({ error: 'Amostra não encontrada' });
    }

    const amostraFormatada = {
      ...row,
      params: row.params ? JSON.parse(row.params) : {},
      micro: row.micro ? JSON.parse(row.micro) : {}
    };

    res.json(amostraFormatada);

  } catch (error) {
    console.error("Erro ao buscar amostra por ID:", error);
    res.status(500).json({ error: 'Erro interno ao buscar detalhes' });
  }
});

// POST nova (Atualizado para receber cliente/ponto/matriz)
app.post('/amostras', (req, res) => {
  try {
    const { codigo, data_coleta, cliente, pontoColeta, matriz } = req.body;

    const result = db.prepare(`
      INSERT INTO amostras (codigo, data_coleta, cliente, pontoColeta, matriz, params, micro)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      codigo,
      data_coleta || null,
      cliente || null,
      pontoColeta || null,
      matriz || null,
      JSON.stringify({}),
      JSON.stringify({})
    );

    res.json({
      id: result.lastInsertRowid,
      codigo,
      cliente,
      status: 'Pendente',
      msg: 'Amostra criada com sucesso'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar amostra' });
  }
});

// PATCH atualizar (Atualizado para permitir editar metadados também)
app.patch('/amostras/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const current = db.prepare('SELECT * FROM amostras WHERE id = ?').get(id);

    if (!current) {
      return res.status(404).json({ error: 'Amostra não encontrada' });
    }

    // Lógica dinâmica para atualizar qualquer campo enviado
    const fields = [];
    const values = [];

    // Campos simples
    ['status', 'cliente', 'pontoColeta', 'matriz', 'data_coleta'].forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });

    // Campos JSON
    if (updates.params !== undefined) {
      fields.push('params = ?');
      values.push(JSON.stringify(updates.params));
    }
    if (updates.micro !== undefined) {
      fields.push('micro = ?');
      values.push(JSON.stringify(updates.micro));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Adiciona ID ao final
    values.push(id);

    const sql = `UPDATE amostras SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    res.json({ ok: true });

  } catch (error) {
    console.error("Erro no PATCH:", error);
    res.status(500).json({ error: 'Erro ao atualizar amostra' });
  }
});

// DELETE seguro
app.delete('/amostras/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM amostras WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Amostra não encontrada' });
    }

    res.json({ ok: true });

  } catch (error) {
    console.error("Erro ao deletar:", error.message);
    res.status(500).json({ 
      error: 'Não foi possível deletar a amostra.',
      details: error.message 
    });
  }
});

// Iniciar Servidor
app.listen(3000, () => {
  console.log('🔥 Backend (index.js) rodando completo em http://localhost:3000');
});