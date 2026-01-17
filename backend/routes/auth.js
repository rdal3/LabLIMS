const express = require('express');
const { hashPassword, comparePassword, createSession } = require('../utils/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();

// POST /auth/login
router.post('/login', (req, res) => {
    const db = req.app.locals.db;
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);

        if (!user) {
            auditLog(db, {
                userEmail: email,
                action: 'AUTH_LOGIN_FAILED',
                ipAddress: req.ip,
                severity: 'WARNING',
                metadata: { reason: 'USER_NOT_FOUND' }
            });
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const valid = comparePassword(password, user.password_hash);

        if (!valid) {
            // Incrementa tentativas falhadas
            db.prepare('UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?').run(user.id);

            auditLog(db, {
                userId: user.id,
                userEmail: user.email,
                action: 'AUTH_LOGIN_FAILED',
                ipAddress: req.ip,
                severity: 'WARNING',
                metadata: { reason: 'INVALID_PASSWORD' }
            });

            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Reset tentativas
        db.prepare('UPDATE users SET failed_login_attempts = 0 WHERE id = ?').run(user.id);

        // Cria sessão
        const { token, user: userData } = createSession(db, user.id, req.ip, req.headers['user-agent']);

        auditLog(db, {
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'AUTH_LOGIN_SUCCESS',
            ipAddress: req.ip,
            severity: 'INFO'
        });

        // Remove senha
        delete userData.password_hash;

        res.json({
            token,
            user: userData,
            mustChangePassword: user.must_change_password === 1
        });

    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ error: 'Erro ao processar login' });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    const db = req.app.locals.db;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Remove sessão
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }

    res.json({ message: 'Logout realizado' });
});

// POST /auth/change-password
router.post('/change-password', require('../middleware/auth').requireAuth, (req, res) => {
    const db = req.app.locals.db;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

        // Verifica senha atual
        const valid = comparePassword(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Atualiza senha
        const newHash = hashPassword(newPassword);
        db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(newHash, req.user.id);

        auditLog(db, {
            userId: req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            action: 'PASSWORD_CHANGED',
            ipAddress: req.ip,
            severity: 'WARNING'
        });

        res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
        console.error('[CHANGE PASSWORD ERROR]', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// GET /auth/me (retorna usuário atual)
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
    res.json(req.user);
});

module.exports = router;
