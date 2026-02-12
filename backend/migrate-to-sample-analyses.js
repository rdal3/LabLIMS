/**
 * SCRIPT DE MIGRAÇÃO STANDALONE
 * Popula a tabela sample_analyses a partir dos JSON arrays existentes.
 * Idempotente: pode ser executado múltiplas vezes sem duplicar registros.
 * 
 * Uso: node migrate-to-sample-analyses.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'lims.db');

console.log('📦 Abrindo banco:', DB_PATH);
const db = new Database(DB_PATH, { verbose: null });
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

// Garante que a tabela existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS sample_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL REFERENCES amostras(id) ON DELETE CASCADE,
    parameter_key TEXT NOT NULL,
    status TEXT CHECK(status IN ('PLANNED','DONE','CANCELED','FAILED')) DEFAULT 'PLANNED',
    planned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    created_by INTEGER REFERENCES users(id),
    completed_by INTEGER REFERENCES users(id),
    notes TEXT,
    UNIQUE(sample_id, parameter_key)
  )
`).run();

db.prepare('CREATE INDEX IF NOT EXISTS idx_sa_sample_status ON sample_analyses(sample_id, status)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_sa_param_status ON sample_analyses(parameter_key, status)').run();

// Busca amostras que têm JSON mas não têm registros em sample_analyses
const samplesToMigrate = db.prepare(`
  SELECT a.id, a.codigo, a.analysesPlanned, a.analysesCompleted
  FROM amostras a
  WHERE a.analysesPlanned IS NOT NULL
    AND a.analysesPlanned != '[]'
    AND NOT EXISTS (SELECT 1 FROM sample_analyses sa WHERE sa.sample_id = a.id)
`).all();

if (samplesToMigrate.length === 0) {
    console.log('✅ Nenhuma amostra pendente de migração. Tudo atualizado!');

    const totalSA = db.prepare('SELECT COUNT(*) as count FROM sample_analyses').get().count;
    console.log(`   Total de registros em sample_analyses: ${totalSA}`);
    db.close();
    process.exit(0);
}

console.log(`\n⚠️  ${samplesToMigrate.length} amostras pendentes de migração\n`);

const insertSA = db.prepare(`
  INSERT OR IGNORE INTO sample_analyses (sample_id, parameter_key, status, planned_at, completed_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
`);

let totalInserted = 0;
let errors = 0;

const migrateAll = db.transaction(() => {
    samplesToMigrate.forEach(sample => {
        let planned = [];
        let completed = [];

        try { planned = JSON.parse(sample.analysesPlanned || '[]'); }
        catch (e) {
            console.error(`   ❌ Erro ao parsear analysesPlanned da amostra ${sample.codigo} (id=${sample.id})`);
            errors++;
            return;
        }

        try { completed = JSON.parse(sample.analysesCompleted || '[]'); }
        catch (e) { completed = []; }

        planned.forEach(paramKey => {
            const isDone = completed.includes(paramKey);
            insertSA.run(
                sample.id,
                paramKey,
                isDone ? 'DONE' : 'PLANNED',
                isDone ? new Date().toISOString() : null
            );
            totalInserted++;
        });

        console.log(`   ✓ ${sample.codigo}: ${planned.length} análises (${completed.length} concluídas)`);
    });
});

migrateAll();

console.log(`\n========================================`);
console.log(`✅ Migração concluída!`);
console.log(`   Amostras processadas: ${samplesToMigrate.length}`);
console.log(`   Registros inseridos:  ${totalInserted}`);
console.log(`   Erros:                ${errors}`);

const totalSA = db.prepare('SELECT COUNT(*) as count FROM sample_analyses').get().count;
console.log(`   Total em sample_analyses: ${totalSA}`);
console.log(`========================================\n`);

db.close();
