/**
 * SCRIPT DE VERIFICAÇÃO DE MIGRAÇÃO
 * Compara os dados dos JSON arrays com os registros em sample_analyses.
 * Reporta discrepâncias se houver.
 * 
 * Uso: node verify-migration.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'lims.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('🔍 Verificando integridade da migração...\n');

// 1. Contagem geral
const totalAmostras = db.prepare('SELECT COUNT(*) as count FROM amostras').get().count;
const amostrasComPlanned = db.prepare(`
  SELECT COUNT(*) as count FROM amostras 
  WHERE analysesPlanned IS NOT NULL AND analysesPlanned != '[]'
`).get().count;
const totalSA = db.prepare('SELECT COUNT(*) as count FROM sample_analyses').get().count;
const saDone = db.prepare("SELECT COUNT(*) as count FROM sample_analyses WHERE status = 'DONE'").get().count;
const saPlanned = db.prepare("SELECT COUNT(*) as count FROM sample_analyses WHERE status = 'PLANNED'").get().count;
const saCanceled = db.prepare("SELECT COUNT(*) as count FROM sample_analyses WHERE status = 'CANCELED'").get().count;

console.log('📊 Resumo Geral:');
console.log(`   Total de amostras:                   ${totalAmostras}`);
console.log(`   Amostras com analysesPlanned:         ${amostrasComPlanned}`);
console.log(`   Total registros em sample_analyses:   ${totalSA}`);
console.log(`     → PLANNED: ${saPlanned}`);
console.log(`     → DONE:    ${saDone}`);
console.log(`     → CANCELED: ${saCanceled}`);

// 2. Verificação amostra por amostra
const samples = db.prepare(`
  SELECT id, codigo, analysesPlanned, analysesCompleted
  FROM amostras 
  WHERE analysesPlanned IS NOT NULL AND analysesPlanned != '[]'
`).all();

let discrepancies = 0;

samples.forEach(sample => {
    let jsonPlanned = [];
    let jsonCompleted = [];

    try { jsonPlanned = JSON.parse(sample.analysesPlanned || '[]'); } catch (e) { return; }
    try { jsonCompleted = JSON.parse(sample.analysesCompleted || '[]'); } catch (e) { /* ok */ }

    const saRecords = db.prepare(`
    SELECT parameter_key, status FROM sample_analyses 
    WHERE sample_id = ? AND status != 'CANCELED'
  `).all(sample.id);

    const saKeys = saRecords.map(r => r.parameter_key);
    const saDoneKeys = saRecords.filter(r => r.status === 'DONE').map(r => r.parameter_key);

    // Verificar se todas as planned estão na tabela
    const missingInSA = jsonPlanned.filter(k => !saKeys.includes(k));
    const extraInSA = saKeys.filter(k => !jsonPlanned.includes(k));

    if (missingInSA.length > 0 || extraInSA.length > 0) {
        discrepancies++;
        console.log(`\n⚠️  Discrepância em ${sample.codigo} (id=${sample.id}):`);
        if (missingInSA.length > 0) {
            console.log(`   Faltando em sample_analyses: ${missingInSA.join(', ')}`);
        }
        if (extraInSA.length > 0) {
            console.log(`   Extra em sample_analyses: ${extraInSA.join(', ')}`);
        }
    }
});

console.log('\n========================================');
if (discrepancies === 0) {
    console.log('✅ VERIFICAÇÃO OK: Nenhuma discrepância encontrada!');
} else {
    console.log(`⚠️  ${discrepancies} discrepância(s) encontrada(s). Revise os dados acima.`);
}
console.log('========================================\n');

db.close();
