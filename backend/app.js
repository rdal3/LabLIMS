// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ===== VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA =====
if (!process.env.JWT_SECRET) {
  console.error('\n⛔ ERRO CRÍTICO: JWT_SECRET não definido!');
  console.error('Defina a variável de ambiente JWT_SECRET antes de iniciar o servidor.');
  console.error('Exemplo: set JWT_SECRET=sua-chave-secreta-minimo-32-caracteres\n');
  process.exit(1);
}

const app = express();

// ===== MIDDLEWARE DE SEGURANÇA =====

// Headers de segurança (proteção contra XSS, clickjacking, etc.)
app.use(helmet());

// CORS configurável para desenvolvimento (aceita localhost e IP local)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (como apps mobile ou Postman)
    if (!origin) return callback(null, true);

    // Permite qualquer IP na rede local (192.168.x.x ou 10.x.x.x)
    if (origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.0\.0\.1)/)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting para prevenir ataques de força bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: { error: 'Muitas requisições, tente novamente mais tarde' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Rate limiting mais restritivo para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Apenas 5 tentativas de login por IP
  message: { error: 'Muitas tentativas de login, tente novamente em 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json());

// Conexão com Banco
const dbPath = path.resolve(__dirname, 'lims.db');
const db = new Database(dbPath);

// JWT Secret (já validado acima)
const JWT_SECRET = process.env.JWT_SECRET;

// Lista de colunas permitidas para edição (Segurança do server.js)
const ALLOWED_COLUMNS = [
  'uuid', 'codigo', 'cliente', 'pontoColeta', 'matriz', 'dataColeta', 'status', 'observacoes',
  'analysesPlanned', 'analysesCompleted',

  // Físico-químicos
  'temperatura', 'ph', 'turbidez', 'condutividade', 'std', 'cloreto', 'cloroResidual',
  'corAparente', 'ferroTotal', 'trihalometanos', 'od', 'oleosGraxas', 'salinidade',
  'sts', 'corVerdadeira', 'dbo', 'dqo', 'nNitrato', 'nNitrito', 'nAmoniacal',
  'sulfato', 'fosforoTotal', 'alcalinidade', 'sst', 'ssv', 'solidosSedimentaveis',

  // Microbiologia
  'coliformesTotais', 'coliformesTermotolerantes', 'escherichiaColi', 'bacteriasHeterotroficas',

  // Metais
  'aluminio', 'bario', 'cadmio', 'chumbo', 'cobre', 'niquel', 'cromo', 'ferro',
  'manganes', 'sodio', 'zinco',

  // BTEX
  'benzeno', 'tolueno', 'etilbenzeno', 'xilenosTotais',

  'params', // Coluna JSON para parâmetros dinâmicos (legado)
  'created_at'
];

// --- MIGRAÇÃO AUTOMÁTICA DE ESQUEMA ---
const migration = () => {
  // 1. Tabela de amostras (existente)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS amostras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      codigo TEXT,
      cliente TEXT,
      pontoColeta TEXT,
      matriz TEXT,
      dataColeta TEXT,
      status TEXT DEFAULT 'Aguardando',
      observacoes TEXT,
      
      -- Tracking de Análises
      analysesPlanned TEXT,
      analysesCompleted TEXT,
      
      -- Físico-Químicos Básicos
      temperatura TEXT, ph TEXT, turbidez TEXT, condutividade TEXT, std TEXT, 
      cloreto TEXT, cloroResidual TEXT, corAparente TEXT, ferroTotal TEXT, trihalometanos TEXT,
      
      -- Físico-Químicos Adicionais
      od TEXT, oleosGraxas TEXT, salinidade TEXT, sts TEXT, corVerdadeira TEXT,
      dbo TEXT, dqo TEXT, nNitrato TEXT, nNitrito TEXT, nAmoniacal TEXT,
      sulfato TEXT, fosforoTotal TEXT, alcalinidade TEXT, sst TEXT, ssv TEXT, solidosSedimentaveis TEXT,
      
      -- Microbiologia
      coliformesTotais TEXT, coliformesTermotolerantes TEXT, escherichiaColi TEXT, bacteriasHeterotroficas TEXT,
      
      -- Metais
      aluminio TEXT, bario TEXT, cadmio TEXT, chumbo TEXT, cobre TEXT, niquel TEXT,
      cromo TEXT, ferro TEXT, manganes TEXT, sodio TEXT, zinco TEXT,
      
      -- BTEX
      benzeno TEXT, tolueno TEXT, etilbenzeno TEXT, xilenosTotais TEXT,

      -- Dinâmicos (legado)
      params TEXT,
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 2. Tabela de usuários
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO')) NOT NULL,
      full_name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id)
    )
  `).run();

  // 3. Tabela de sessões
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      token_hash TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 4. Tabela de auditoria
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER REFERENCES users(id),
      user_email TEXT NOT NULL,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      state_before TEXT,
      state_after TEXT,
      ip_address TEXT,
      severity TEXT DEFAULT 'INFO',
      metadata TEXT
    )
  `).run();

  // 5. Adicionar coluna uuid se não existir (para migrations antigas)
  const columns = db.prepare("PRAGMA table_info(amostras)").all();
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('uuid')) {
    console.log('⚠️ Adicionando coluna UUID...');
    db.prepare('ALTER TABLE amostras ADD COLUMN uuid TEXT').run();

    // Gerar UUIDs para registros existentes
    const existingSamples = db.prepare('SELECT id, codigo, dataColeta FROM amostras WHERE uuid IS NULL').all();
    existingSamples.forEach(sample => {
      const uuid = `${sample.codigo}_${sample.dataColeta}_${Date.now()}_${sample.id}`;
      db.prepare('UPDATE amostras SET uuid = ? WHERE id = ?').run(uuid, sample.id);
    });
  }

  // 6. Remover UNIQUE constraint de codigo (se existir)
  // SQLite não permite remover constraints diretamente, então precisamos recriar a tabela
  const indexes = db.prepare("PRAGMA index_list(amostras)").all();
  const hasUniqueOnCodigo = indexes.some(idx =>
    idx.unique === 1 && db.prepare(`PRAGMA index_info(${idx.name})`).all().some(col => col.name === 'codigo')
  );

  if (hasUniqueOnCodigo) {
    console.log('⚠️ Removendo constraint UNIQUE de codigo (recriando tabela)...');

    // Backup dos dados
    const allData = db.prepare('SELECT * FROM amostras').all();

    // Dropa a tabela antiga
    db.prepare('DROP TABLE amostras').run();

    // Recria a tabela sem UNIQUE em codigo
    db.prepare(`
      CREATE TABLE amostras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        codigo TEXT,
        cliente TEXT,
        pontoColeta TEXT,
        matriz TEXT,
        dataColeta TEXT,
        status TEXT DEFAULT 'Aguardando',
        observacoes TEXT,
        analysesPlanned TEXT,
        analysesCompleted TEXT,
        temperatura TEXT, ph TEXT, turbidez TEXT, condutividade TEXT, std TEXT,
        cloreto TEXT, cloroResidual TEXT, corAparente TEXT, ferroTotal TEXT, trihalometanos TEXT,
        od TEXT, oleosGraxas TEXT, salinidade TEXT, sts TEXT, corVerdadeira TEXT,
        dbo TEXT, dqo TEXT, nNitrato TEXT, nNitrito TEXT, nAmoniacal TEXT,
        sulfato TEXT, fosforoTotal TEXT, alcalinidade TEXT, sst TEXT, ssv TEXT, solidosSedimentaveis TEXT,
        coliformesTotais TEXT, coliformesTermotolerantes TEXT, escherichiaColi TEXT, bacteriasHeterotroficas TEXT,
        aluminio TEXT, bario TEXT, cadmio TEXT, chumbo TEXT, cobre TEXT, niquel TEXT,
        cromo TEXT, ferro TEXT, manganes TEXT, sodio TEXT, zinco TEXT,
        benzeno TEXT, tolueno TEXT, etilbenzeno TEXT, xilenosTotais TEXT,
        params TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Restaura os dados
    if (allData.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO amostras (id, uuid, codigo, cliente, pontoColeta, matriz, dataColeta, status, observacoes,
                             analysesPlanned, analysesCompleted, temperatura, ph, turbidez, condutividade, std,
                             cloreto, cloroResidual, corAparente, ferroTotal, trihalometanos, od, oleosGraxas,
                             salinidade, sts, corVerdadeira, dbo, dqo, nNitrato, nNitrito, nAmoniacal, sulfato,
                             fosforoTotal, alcalinidade, sst, ssv, solidosSedimentaveis, coliformesTotais,
                             coliformesTermotolerantes, escherichiaColi, bacteriasHeterotroficas, aluminio,
                             bario, cadmio, chumbo, cobre, niquel, cromo, ferro, manganes, sodio, zinco,
                             benzeno, tolueno, etilbenzeno, xilenosTotais, params, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      allData.forEach(row => {
        insertStmt.run(
          row.id, row.uuid, row.codigo, row.cliente, row.pontoColeta, row.matriz, row.dataColeta,
          row.status, row.observacoes, row.analysesPlanned, row.analysesCompleted, row.temperatura,
          row.ph, row.turbidez, row.condutividade, row.std, row.cloreto, row.cloroResidual,
          row.corAparente, row.ferroTotal, row.trihalometanos, row.od, row.oleosGraxas, row.salinidade,
          row.sts, row.corVerdadeira, row.dbo, row.dqo, row.nNitrato, row.nNitrito, row.nAmoniacal,
          row.sulfato, row.fosforoTotal, row.alcalinidade, row.sst, row.ssv, row.solidosSedimentaveis,
          row.coliformesTotais, row.coliformesTermotolerantes, row.escherichiaColi, row.bacteriasHeterotroficas,
          row.aluminio, row.bario, row.cadmio, row.chumbo, row.cobre, row.niquel, row.cromo, row.ferro,
          row.manganes, row.sodio, row.zinco, row.benzeno, row.tolueno, row.etilbenzeno, row.xilenosTotais,
          row.params, row.created_at
        );
      });

      console.log(`✅ ${allData.length} registros migrados com sucesso`);
    }
  }

  // 7. Auto-migração de outras colunas (amostras)
  const existingColumnNames = columns.map(c => c.name);

  ALLOWED_COLUMNS.forEach(col => {
    if (!existingColumnNames.includes(col) && col !== 'uuid') {
      console.log(`⚠️ Migrando: Adicionando coluna '${col}'...`);
      try {
        db.prepare(`ALTER TABLE amostras ADD COLUMN ${col} TEXT`).run();
      } catch (e) {
        console.error(`Erro ao adicionar ${col}:`, e.message);
      }
    }
  });

  console.log('✅ Migração de banco concluída');
};

// Executa migração ao iniciar
migration();

// Disponibiliza DB para rotas
app.locals.db = db;

// --- ROTAS DE AUTENTICAÇÃO ---
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const { requireAuth, requireRole } = require('./middleware/auth');

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);

// Cria primeiro usuário ADMIN se não existir nenhum
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const { hashPassword } = require('./utils/auth');
  const defaultPassword = hashPassword('admin123');

  db.prepare(`
    INSERT INTO users (email, password_hash, role, full_name, must_change_password)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin@lab.com', defaultPassword, 'ADMIN', 'Administrador', 1);

  console.log('');
  console.log('🔑 ========================================');
  console.log('   PRIMEIRO ACESSO - Usuário Admin Criado');
  console.log('🔑 ========================================');
  console.log('   Email:    admin@lab.com');
  console.log('   Senha:    admin123');
  console.log('   ⚠️  TROQUE A SENHA APÓS PRIMEIRO LOGIN');
  console.log('==========================================');
  console.log('');
}

// --- ROTAS DE AMOSTRAS (PROTEGIDAS) ---

// 1. GET TODAS (Com busca inteligente)
app.get('/amostras', requireAuth, (req, res) => {
  try {
    const { busca, ordem } = req.query;
    let sql = 'SELECT * FROM amostras';
    const params = [];

    if (busca) {
      sql += ' WHERE (codigo LIKE ? OR cliente LIKE ? OR status LIKE ?)';
      const term = `%${busca}%`;
      params.push(term, term, term);
    }

    // Usa o parâmetro de ordem ou padrão DESC (mais recentes primeiro)
    const sortOrder = ordem === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY id ${sortOrder}`;

    const rows = db.prepare(sql).all(...params);

    // Parseia JSONs de volta para objetos
    const processedRows = rows.map(r => {
      const processed = { ...r };

      // Parse analysesPlanned
      if (r.analysesPlanned) {
        try {
          processed.analysesPlanned = JSON.parse(r.analysesPlanned);
        } catch (e) {
          console.error("Erro ao parsear analysesPlanned ID " + r.id, e);
          processed.analysesPlanned = [];
        }
      }

      // Parse analysesCompleted
      if (r.analysesCompleted) {
        try {
          processed.analysesCompleted = JSON.parse(r.analysesCompleted);
        } catch (e) {
          console.error("Erro ao parsear analysesCompleted ID " + r.id, e);
          processed.analysesCompleted = [];
        }
      }

      // Parse params (legado)
      if (r.params) {
        try {
          processed.params = JSON.parse(r.params);
        } catch (e) {
          console.error("Erro ao parsear params ID " + r.id, e);
        }
      }

      return processed;
    });

    res.json(processedRows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET ÚNICA
app.get('/amostras/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM amostras WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Amostra não encontrada' });

    // Parse JSONs
    if (row.analysesPlanned) {
      try {
        row.analysesPlanned = JSON.parse(row.analysesPlanned);
      } catch (e) { console.error(e); row.analysesPlanned = []; }
    }

    if (row.analysesCompleted) {
      try {
        row.analysesCompleted = JSON.parse(row.analysesCompleted);
      } catch (e) { console.error(e); row.analysesCompleted = []; }
    }

    if (row.params) {
      try {
        row.params = JSON.parse(row.params);
      } catch (e) { console.error(e); }
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST (Criar Nova) - Apenas ADMIN, PROFESSOR e TÉCNICO
app.post('/amostras', requireAuth, requireRole('ADMIN', 'PROFESSOR', 'TÉCNICO'), (req, res) => {
  try {
    // Pega dados iniciais incluindo matriz e análises planejadas
    const { codigo, cliente, pontoColeta, matriz, dataColeta, analysesPlanned } = req.body;

    // Gera UUID único: codigo + data + timestamp + random
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const uuid = `${codigo}_${dataColeta}_${timestamp}_${random}`;

    // Serializa arrays para JSON
    const analysesPlanStr = analysesPlanned ? JSON.stringify(analysesPlanned) : '[]';
    const analysesCompStr = '[]'; // Inicia vazio

    const stmt = db.prepare(`
      INSERT INTO amostras (uuid, codigo, cliente, pontoColeta, matriz, dataColeta, status, analysesPlanned, analysesCompleted)
      VALUES (?, ?, ?, ?, ?, ?, 'Aguardando', ?, ?)
    `);

    const info = stmt.run(uuid, codigo, cliente, pontoColeta, matriz, dataColeta, analysesPlanStr, analysesCompStr);

    res.json({
      id: info.lastInsertRowid,
      uuid,
      codigo,
      matriz,
      msg: 'Amostra criada com sucesso'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar amostra: ' + error.message });
  }
});

// 4. PATCH (Atualizar qualquer campo permitido) - Apenas ADMIN, PROFESSOR e TÉCNICO
app.patch('/amostras/:id', requireAuth, requireRole('ADMIN', 'PROFESSOR', 'TÉCNICO'), (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Filtra apenas colunas permitidas (Segurança)
    const keys = Object.keys(updates).filter(key => ALLOWED_COLUMNS.includes(key));

    if (keys.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
    }

    // Lógica para Parâmetros Dinâmicos
    if (updates.resultados) {
      // Se vier 'resultados' do frontend, salvamos na coluna 'params'
      keys.push('params');
      updates.params = JSON.stringify(updates.resultados);

      // Remove 'resultados' da lista de keys se tiver entrado apenas por segurança, 
      // mas como filtramos ALLOWED_COLUMNS antes, 'resultados' não entraria.
      // E agora adicionamos 'params' explicitamente.
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

// 5. DELETE - Apenas ADMIN e PROFESSOR
app.delete('/amostras/:id', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
  try {
    const info = db.prepare('DELETE FROM amostras WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Amostra não encontrada' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DASHBOARD ENDPOINTS (PROTEGIDOS) ---

// 1. Estatísticas Gerais
app.get('/dashboard/stats', requireAuth, (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM amostras').get().count,
      aguardando: db.prepare("SELECT COUNT(*) as count FROM amostras WHERE status = 'Aguardando'").get().count,
      emAnalise: db.prepare("SELECT COUNT(*) as count FROM amostras WHERE status = 'Em Análise'").get().count,
      concluido: db.prepare("SELECT COUNT(*) as count FROM amostras WHERE status = 'Concluído'").get().count
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Progresso por Matriz
app.get('/dashboard/by-matrix', requireAuth, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT 
        matriz,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE WHEN status = 'Em Análise' THEN 1 ELSE 0 END) as emAnalise
      FROM amostras
      WHERE matriz IS NOT NULL AND matriz != ''
      GROUP BY matriz
    `).all();

    // Calcula porcentagem de progresso
    const processed = data.map(m => ({
      ...m,
      percentComplete: m.total > 0 ? Math.round((m.concluidas / m.total) * 100) : 0
    }));

    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Timeline (últimos 30 dias)
app.get('/dashboard/timeline', requireAuth, (req, res) => {
  try {
    const data = db.prepare(`
      SELECT 
        DATE(dataColeta) as date,
        COUNT(*) as count
      FROM amostras
      WHERE dataColeta >= DATE('now', '-30 days')
      GROUP BY DATE(dataColeta)
      ORDER BY date ASC
    `).all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Top Análises
app.get('/dashboard/top-analyses', requireAuth, (req, res) => {
  try {
    // Conta todas as análises planejadas
    const rows = db.prepare('SELECT analysesPlanned FROM amostras WHERE analysesPlanned IS NOT NULL').all();
    const analysisCount = {};

    rows.forEach(row => {
      try {
        const analyses = JSON.parse(row.analysesPlanned);
        analyses.forEach(analysisId => {
          analysisCount[analysisId] = (analysisCount[analysisId] || 0) + 1;
        });
      } catch (e) {
        // Ignora erros de parse
      }
    });

    // Converte para array e ordena
    const topAnalyses = Object.entries(analysisCount)
      .map(([analysis, count]) => ({ analysis, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(topAnalyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- INICIA O SERVIDOR ---
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Permite acesso de outros dispositivos na rede
app.listen(PORT, HOST, () => {
  console.log(`✅ Backend (Híbrido) rodando em http://${HOST}:${PORT}`);
});