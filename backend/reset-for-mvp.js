/**
 * Script para resetar o banco de dados para MVP
 * 
 * ATENÇÃO: Este script APAGA TODOS OS DADOS!
 * Use apenas para preparar um ambiente limpo.
 * 
 * Uso: node reset-for-mvp.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'lims.db');
const db = new Database(DB_PATH);

console.log('⚠️  RESET PARA MVP - Apagando todos os dados...\n');

// 1. Apagar dados de todas as tabelas
console.log('🗑️  Limpando tabelas...');

db.prepare('DELETE FROM sample_modifications').run();
console.log('   ✓ sample_modifications');

db.prepare('DELETE FROM audit_logs').run();
console.log('   ✓ audit_logs');

db.prepare('DELETE FROM sessions').run();
console.log('   ✓ sessions');

db.prepare('DELETE FROM amostras').run();
console.log('   ✓ amostras');

db.prepare('DELETE FROM custom_parameters').run();
console.log('   ✓ custom_parameters');

db.prepare('DELETE FROM users').run();
console.log('   ✓ users');

// Reset auto-increment
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('amostras', 'users', 'sessions', 'audit_logs', 'sample_modifications')").run();
console.log('   ✓ Reset contadores de ID');

// 2. Criar usuário admin padrão
console.log('\n👤 Criando usuário admin padrão...');

const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT INTO users (email, password_hash, full_name, role, active, must_change_password)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  'admin@lab.com',
  adminPassword,
  'Administrador',
  'ADMIN',
  1,
  1  // Forçar mudança de senha no primeiro login
);

console.log('   ✓ admin@lab.com criado (senha: admin123)');
console.log('   ⚠️  Usuário deve trocar a senha no primeiro login');

// 3. Estatísticas finais
console.log('\n📊 Status final do banco:');
const tables = ['users', 'amostras', 'sessions', 'audit_logs', 'sample_modifications', 'custom_parameters'];
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
  console.log(`   ${table}: ${count} registros`);
});

db.close();

console.log('\n✅ Banco de dados resetado com sucesso!');
console.log('\n📋 Próximos passos:');
console.log('   1. Inicie o backend: node app.js');
console.log('   2. Acesse o sistema com: admin@lab.com / admin123');
console.log('   3. Troque a senha no primeiro login');
console.log('   4. Crie os usuários necessários pelo painel admin\n');
