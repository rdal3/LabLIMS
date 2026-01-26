/**
 * Admin Routes - Rotas exclusivas para administradores
 * TODAS as rotas aqui são protegidas por requireRole('ADMIN')
 */

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const { hashPassword } = require('../utils/auth');

const router = express.Router();

// Aplica proteção ADMIN em TODAS as rotas deste arquivo
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// ==========================================
// AUDIT LOGS - Histórico de atividades
// ==========================================

// GET /admin/audit-logs - Listar logs com filtros e paginação
router.get('/audit-logs', (req, res) => {
    const db = req.app.locals.db;
    const {
        page = 1,
        limit = 50,
        action,
        severity,
        userId,
        startDate,
        endDate,
        search
    } = req.query;

    try {
        let whereConditions = [];
        let params = [];

        if (action) {
            whereConditions.push('action = ?');
            params.push(action);
        }

        if (severity) {
            whereConditions.push('severity = ?');
            params.push(severity);
        }

        if (userId) {
            whereConditions.push('user_id = ?');
            params.push(userId);
        }

        if (startDate) {
            whereConditions.push('date(timestamp) >= date(?)');
            params.push(startDate);
        }

        if (endDate) {
            whereConditions.push('date(timestamp) <= date(?)');
            params.push(endDate);
        }

        if (search) {
            whereConditions.push('(user_email LIKE ? OR action LIKE ? OR metadata LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Contagem total
        const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const { total } = db.prepare(countQuery).get(...params);

        // Dados paginados
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const dataQuery = `
            SELECT 
                al.*,
                u.full_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `;

        const logs = db.prepare(dataQuery).all(...params, parseInt(limit), offset);

        // Parse JSON fields
        const processedLogs = logs.map(log => ({
            ...log,
            state_before: log.state_before ? JSON.parse(log.state_before) : null,
            state_after: log.state_after ? JSON.parse(log.state_after) : null,
            metadata: log.metadata ? JSON.parse(log.metadata) : null
        }));

        res.json({
            data: processedLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('[ADMIN AUDIT-LOGS ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
});

// GET /admin/audit-logs/actions - Lista de ações únicas
router.get('/audit-logs/actions', (req, res) => {
    const db = req.app.locals.db;

    try {
        const actions = db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all();
        res.json(actions.map(a => a.action));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ações' });
    }
});

// GET /admin/audit-logs/export - Exportar logs como CSV
router.get('/audit-logs/export', (req, res) => {
    const db = req.app.locals.db;
    const { startDate, endDate } = req.query;

    try {
        let query = `
            SELECT 
                timestamp, user_email, user_role, action, 
                entity_type, entity_id, severity, ip_address
            FROM audit_logs
        `;
        const params = [];

        if (startDate && endDate) {
            query += ' WHERE date(timestamp) BETWEEN date(?) AND date(?)';
            params.push(startDate, endDate);
        }

        query += ' ORDER BY timestamp DESC';

        const logs = db.prepare(query).all(...params);

        // Gerar CSV
        const headers = ['Data/Hora', 'Usuário', 'Papel', 'Ação', 'Entidade', 'ID Entidade', 'Severidade', 'IP'];
        const csvRows = [headers.join(';')];

        logs.forEach(log => {
            csvRows.push([
                log.timestamp,
                log.user_email,
                log.user_role || '',
                log.action,
                log.entity_type || '',
                log.entity_id || '',
                log.severity,
                log.ip_address || ''
            ].join(';'));
        });

        // Auditar exportação
        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_EXPORT_AUDIT_LOGS',
            ipAddress: req.ip,
            severity: 'WARNING',
            metadata: { recordCount: logs.length, startDate, endDate }
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\uFEFF' + csvRows.join('\n')); // BOM para Excel

    } catch (error) {
        console.error('[ADMIN EXPORT ERROR]', error);
        res.status(500).json({ error: 'Erro ao exportar logs' });
    }
});

// ==========================================
// SESSIONS - Gerenciamento de sessões ativas
// ==========================================

// GET /admin/sessions - Listar todas as sessões ativas
router.get('/sessions', (req, res) => {
    const db = req.app.locals.db;

    try {
        const sessions = db.prepare(`
            SELECT 
                s.id,
                s.user_id,
                s.ip_address,
                s.user_agent,
                s.expires_at,
                s.created_at,
                u.email as user_email,
                u.full_name as user_name,
                u.role as user_role
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE datetime(s.expires_at) > datetime('now')
            ORDER BY s.created_at DESC
        `).all();

        res.json(sessions);

    } catch (error) {
        console.error('[ADMIN SESSIONS ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar sessões' });
    }
});

// DELETE /admin/sessions/:id - Revogar sessão específica
router.delete('/sessions/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;

    try {
        // Busca sessão antes de deletar
        const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

        if (!session) {
            return res.status(404).json({ error: 'Sessão não encontrada' });
        }

        // Busca usuário da sessão
        const targetUser = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(session.user_id);

        // Remove sessão
        db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

        // Audita revogação
        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_REVOKE_SESSION',
            entityType: 'sessions',
            entityId: id,
            ipAddress: req.ip,
            severity: 'CRITICAL',
            metadata: {
                targetUserId: session.user_id,
                targetUserEmail: targetUser?.email,
                targetUserName: targetUser?.full_name
            }
        });

        res.json({ message: 'Sessão revogada com sucesso' });

    } catch (error) {
        console.error('[ADMIN REVOKE SESSION ERROR]', error);
        res.status(500).json({ error: 'Erro ao revogar sessão' });
    }
});

// DELETE /admin/sessions/user/:userId - Revogar TODAS as sessões de um usuário
router.delete('/sessions/user/:userId', (req, res) => {
    const db = req.app.locals.db;
    const { userId } = req.params;

    try {
        const targetUser = db.prepare('SELECT email, full_name FROM users WHERE id = ?').get(userId);

        if (!targetUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const result = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_REVOKE_ALL_USER_SESSIONS',
            entityType: 'users',
            entityId: userId,
            ipAddress: req.ip,
            severity: 'CRITICAL',
            metadata: {
                targetUserEmail: targetUser.email,
                sessionsRevoked: result.changes
            }
        });

        res.json({ message: `${result.changes} sessão(ões) revogada(s)` });

    } catch (error) {
        console.error('[ADMIN REVOKE ALL SESSIONS ERROR]', error);
        res.status(500).json({ error: 'Erro ao revogar sessões' });
    }
});

// ==========================================
// USERS - Gerenciamento avançado de usuários
// ==========================================

// GET /admin/users - Listar TODOS os usuários (incluindo inativos)
router.get('/users', (req, res) => {
    const db = req.app.locals.db;

    try {
        const users = db.prepare(`
            SELECT 
                u.id, u.email, u.role, u.full_name, u.active, 
                u.must_change_password, u.failed_login_attempts,
                u.created_at, u.created_by,
                creator.full_name as created_by_name,
                (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND datetime(s.expires_at) > datetime('now')) as active_sessions
            FROM users u
            LEFT JOIN users creator ON u.created_by = creator.id
            ORDER BY u.created_at DESC
        `).all();

        res.json(users);

    } catch (error) {
        console.error('[ADMIN USERS ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// DELETE /admin/users/:id/permanent - Excluir usuário PERMANENTEMENTE
router.delete('/users/:id/permanent', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Não pode deletar a si mesmo
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Não pode deletar sua própria conta' });
        }

        // Verifica se é o último admin
        if (user.role === 'ADMIN') {
            const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND active = 1").get().count;
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Não pode deletar o único administrador ativo' });
            }
        }

        // Remove sessões do usuário primeiro
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

        // Remove o usuário permanentemente
        db.prepare('DELETE FROM users WHERE id = ?').run(id);

        // Registra exclusão (mantém dados essenciais no log)
        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_USER_PERMANENT_DELETE',
            entityType: 'users',
            entityId: id,
            ipAddress: req.ip,
            severity: 'CRITICAL',
            stateBefore: {
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                created_at: user.created_at
            }
        });

        res.json({ message: 'Usuário excluído permanentemente' });

    } catch (error) {
        console.error('[ADMIN PERMANENT DELETE ERROR]', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// PATCH /admin/users/:id/reset-password - Reset de senha por admin
router.patch('/users/:id/reset-password', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const newHash = hashPassword(newPassword);

        // Reset senha e força mudança no próximo login
        db.prepare(`
            UPDATE users 
            SET password_hash = ?, must_change_password = 1, failed_login_attempts = 0 
            WHERE id = ?
        `).run(newHash, id);

        // Revoga todas as sessões do usuário
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_RESET_USER_PASSWORD',
            entityType: 'users',
            entityId: id,
            ipAddress: req.ip,
            severity: 'CRITICAL',
            metadata: { targetEmail: user.email }
        });

        res.json({ message: 'Senha resetada com sucesso' });

    } catch (error) {
        console.error('[ADMIN RESET PASSWORD ERROR]', error);
        res.status(500).json({ error: 'Erro ao resetar senha' });
    }
});

// PATCH /admin/users/:id/unlock - Desbloquear conta (reset failed attempts)
router.patch('/users/:id/unlock', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        db.prepare('UPDATE users SET failed_login_attempts = 0 WHERE id = ?').run(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_UNLOCK_USER',
            entityType: 'users',
            entityId: id,
            ipAddress: req.ip,
            severity: 'WARNING',
            metadata: {
                targetEmail: user.email,
                previousAttempts: user.failed_login_attempts
            }
        });

        res.json({ message: 'Conta desbloqueada' });

    } catch (error) {
        console.error('[ADMIN UNLOCK ERROR]', error);
        res.status(500).json({ error: 'Erro ao desbloquear conta' });
    }
});

// ==========================================
// SYSTEM STATS - Estatísticas avançadas
// ==========================================

// GET /admin/stats - Estatísticas do sistema
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;

    try {
        // Estatísticas gerais
        const users = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive
            FROM users
        `).get();

        const usersByRole = db.prepare(`
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE active = 1 
            GROUP BY role
        `).all();

        const samples = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Aguardando' THEN 1 ELSE 0 END) as aguardando,
                SUM(CASE WHEN status = 'Em Análise' THEN 1 ELSE 0 END) as emAnalise,
                SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as concluido
            FROM amostras
        `).get();

        const activeSessions = db.prepare(`
            SELECT COUNT(*) as count 
            FROM sessions 
            WHERE datetime(expires_at) > datetime('now')
        `).get().count;

        const auditStats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning,
                SUM(CASE WHEN date(timestamp) = date('now') THEN 1 ELSE 0 END) as today
            FROM audit_logs
        `).get();

        // Atividade dos últimos 7 dias
        const activityLast7Days = db.prepare(`
            SELECT 
                date(timestamp) as date,
                COUNT(*) as count
            FROM audit_logs
            WHERE date(timestamp) >= date('now', '-7 days')
            GROUP BY date(timestamp)
            ORDER BY date ASC
        `).all();

        // Top ações
        const topActions = db.prepare(`
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE date(timestamp) >= date('now', '-30 days')
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        `).all();

        // Usuários mais ativos
        const topUsers = db.prepare(`
            SELECT 
                user_email,
                COUNT(*) as actions
            FROM audit_logs
            WHERE date(timestamp) >= date('now', '-30 days')
            AND user_email != 'system'
            GROUP BY user_email
            ORDER BY actions DESC
            LIMIT 5
        `).all();

        // Amostras por mês (últimos 6 meses)
        const samplesByMonth = db.prepare(`
            SELECT 
                strftime('%Y-%m', dataColeta) as month,
                COUNT(*) as count
            FROM amostras
            WHERE dataColeta >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', dataColeta)
            ORDER BY month ASC
        `).all();

        res.json({
            users,
            usersByRole,
            samples,
            activeSessions,
            auditStats,
            activityLast7Days,
            topActions,
            topUsers,
            samplesByMonth,
            serverTime: new Date().toISOString()
        });

    } catch (error) {
        console.error('[ADMIN STATS ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// ==========================================
// CUSTOM PARAMETERS - Gerenciamento de parâmetros
// ==========================================

// GET /admin/parameters - Listar parâmetros customizados
router.get('/parameters', (req, res) => {
    const db = req.app.locals.db;

    try {
        const params = db.prepare(`
            SELECT * FROM custom_parameters 
            ORDER BY category, display_order, label
        `).all();

        // Parse options JSON
        const processed = params.map(p => ({
            ...p,
            options: p.options ? JSON.parse(p.options) : null
        }));

        res.json(processed);

    } catch (error) {
        console.error('[ADMIN PARAMETERS ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar parâmetros' });
    }
});

// POST /admin/parameters - Criar novo parâmetro
router.post('/parameters', (req, res) => {
    const db = req.app.locals.db;
    const { id, label, category, unit, options, isColumn } = req.body;

    if (!id || !label || !category) {
        return res.status(400).json({ error: 'ID, label e categoria são obrigatórios' });
    }

    // Validar formato do ID (snake_case ou camelCase)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(id)) {
        return res.status(400).json({ error: 'ID inválido. Use apenas letras, números e underscore' });
    }

    try {
        // Verifica se já existe
        const existing = db.prepare('SELECT id FROM custom_parameters WHERE id = ?').get(id);
        if (existing) {
            return res.status(400).json({ error: 'Parâmetro com este ID já existe' });
        }

        const result = db.prepare(`
            INSERT INTO custom_parameters (id, label, category, unit, options, is_column, active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
            id,
            label,
            category,
            unit || null,
            options ? JSON.stringify(options) : null,
            isColumn ? 1 : 0,
            req.user.id
        );

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_CREATE_PARAMETER',
            entityType: 'custom_parameters',
            entityId: id,
            ipAddress: req.ip,
            severity: 'WARNING',
            stateAfter: { id, label, category, unit, options, isColumn }
        });

        res.status(201).json({
            message: 'Parâmetro criado com sucesso',
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('[ADMIN CREATE PARAMETER ERROR]', error);
        res.status(500).json({ error: 'Erro ao criar parâmetro' });
    }
});

// PATCH /admin/parameters/:id - Atualizar parâmetro
router.patch('/parameters/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { label, unit, options, active } = req.body;

    try {
        const existing = db.prepare('SELECT * FROM custom_parameters WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Parâmetro não encontrado' });
        }

        const updates = [];
        const values = [];

        if (label !== undefined) {
            updates.push('label = ?');
            values.push(label);
        }

        if (unit !== undefined) {
            updates.push('unit = ?');
            values.push(unit);
        }

        if (options !== undefined) {
            updates.push('options = ?');
            values.push(options ? JSON.stringify(options) : null);
        }

        if (active !== undefined) {
            updates.push('active = ?');
            values.push(active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.prepare(`UPDATE custom_parameters SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM custom_parameters WHERE id = ?').get(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_UPDATE_PARAMETER',
            entityType: 'custom_parameters',
            entityId: id,
            ipAddress: req.ip,
            severity: 'WARNING',
            stateBefore: existing,
            stateAfter: updated
        });

        res.json({ message: 'Parâmetro atualizado', parameter: updated });

    } catch (error) {
        console.error('[ADMIN UPDATE PARAMETER ERROR]', error);
        res.status(500).json({ error: 'Erro ao atualizar parâmetro' });
    }
});

// DELETE /admin/parameters/:id - Remover parâmetro (soft delete)
router.delete('/parameters/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;

    try {
        const existing = db.prepare('SELECT * FROM custom_parameters WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Parâmetro não encontrado' });
        }

        // Soft delete - apenas desativa
        db.prepare('UPDATE custom_parameters SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_DELETE_PARAMETER',
            entityType: 'custom_parameters',
            entityId: id,
            ipAddress: req.ip,
            severity: 'WARNING',
            stateBefore: existing
        });

        res.json({ message: 'Parâmetro removido' });

    } catch (error) {
        console.error('[ADMIN DELETE PARAMETER ERROR]', error);
        res.status(500).json({ error: 'Erro ao remover parâmetro' });
    }
});

// ==========================================
// DATABASE - Operações de manutenção
// ==========================================

// POST /admin/cleanup-sessions - Limpar sessões expiradas
router.post('/cleanup-sessions', (req, res) => {
    const db = req.app.locals.db;

    try {
        const result = db.prepare(`
            DELETE FROM sessions 
            WHERE datetime(expires_at) < datetime('now')
        `).run();

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'ADMIN_CLEANUP_SESSIONS',
            ipAddress: req.ip,
            severity: 'INFO',
            metadata: { sessionsRemoved: result.changes }
        });

        res.json({
            message: `${result.changes} sessõe(s) expirada(s) removida(s)`,
            removed: result.changes
        });

    } catch (error) {
        console.error('[ADMIN CLEANUP ERROR]', error);
        res.status(500).json({ error: 'Erro ao limpar sessões' });
    }
});

// GET /admin/database-info - Informações do banco de dados
router.get('/database-info', (req, res) => {
    const db = req.app.locals.db;

    try {
        const tables = db.prepare(`
            SELECT name, 
                   (SELECT COUNT(*) FROM pragma_table_info(name)) as columns
            FROM sqlite_master 
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        `).all();

        const tablesWithCounts = tables.map(t => {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get().count;
            return { ...t, rows: count };
        });

        const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();

        res.json({
            tables: tablesWithCounts,
            sizeBytes: dbSize?.size || 0,
            sizeMB: ((dbSize?.size || 0) / (1024 * 1024)).toFixed(2)
        });

    } catch (error) {
        console.error('[ADMIN DB INFO ERROR]', error);
        res.status(500).json({ error: 'Erro ao buscar informações do banco' });
    }
});

module.exports = router;
