const express = require('express');
const { hashPassword } = require('../utils/auth');
const { auditLog } = require('../utils/audit');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /users - Listar usuários (Admin e Professor)
router.get('/', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;

    try {
        const users = db.prepare(`
      SELECT id, email, role, full_name, active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();

        res.json(users);
    } catch (error) {
        console.error('[USERS LIST ERROR]', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// POST /users - Criar usuário (Admin e Professor)
router.post('/', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;
    const { email, password, role, full_name } = req.body;

    // Validações
    if (!email || !password || !role || !full_name) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (!['ADMIN', 'PROFESSOR', 'TÉCNICO', 'VOLUNTÁRIO'].includes(role)) {
        return res.status(400).json({ error: 'Papel inválido' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    }

    // Professor não pode criar Admin
    if (req.user.role === 'PROFESSOR' && role === 'ADMIN') {
        return res.status(403).json({ error: 'Professor não pode criar Admin' });
    }

    try {
        // Verifica se email já existe
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const passwordHash = hashPassword(password);

        const result = db.prepare(`
      INSERT INTO users (email, password_hash, role, full_name, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, passwordHash, role, full_name, req.user.id);

        const newUser = db.prepare('SELECT id, email, role, full_name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'USER_CREATED',
            entityType: 'users',
            entityId: newUser.id.toString(),
            ipAddress: req.ip,
            severity: 'WARNING',
            metadata: { newUserRole: role, newUserEmail: email }
        });

        res.status(201).json(newUser);

    } catch (error) {
        console.error('[USER CREATE ERROR]', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// PATCH /users/:id - Atualizar usuário
router.patch('/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { active, role } = req.body;

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const updates = [];
        const values = [];

        if (typeof active !== 'undefined') {
            updates.push('active = ?');
            values.push(active ? 1 : 0);
        }

        if (role) {
            updates.push('role = ?');
            values.push(role);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        values.push(id);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT id, email, role, full_name, active FROM users WHERE id = ?').get(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'USER_UPDATED',
            entityType: 'users',
            entityId: id,
            ipAddress: req.ip,
            severity: 'WARNING',
            stateBefore: user,
            stateAfter: updated
        });

        res.json(updated);

    } catch (error) {
        console.error('[USER UPDATE ERROR]', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// DELETE /users/:id - Deletar usuário (Admin e Professor)
router.delete('/:id', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
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

        // Professor não pode deletar Admin
        if (req.user.role === 'PROFESSOR' && user.role === 'ADMIN') {
            return res.status(403).json({ error: 'Professor não pode deletar Admin' });
        }

        // Soft delete (apenas desativa)
        db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'USER_DELETED',
            entityType: 'users',
            entityId: id,
            ipAddress: req.ip,
            severity: 'CRITICAL',
            stateBefore: user
        });

        res.json({ message: 'Usuário desativado com sucesso' });

    } catch (error) {
        console.error('[USER DELETE ERROR]', error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

module.exports = router;
