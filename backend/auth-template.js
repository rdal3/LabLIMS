const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com Banco
const dbPath = path.resolve(__dirname, 'lims.db');
const db = new Database(dbPath);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'lab-lims-secret-change-in-production-2026';

// --- UTIL FUNCTIONS ---

function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function createSession(userId, ipAddress, userAgent) {
    const sessionId = crypto.randomUUID();
    const token = generateToken({ id: userId });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt.toISOString());

    return { sessionId, token };
}

function auditLog(data) {
    db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, state_before, state_after, ip_address, severity, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        data.userId || null,
        data.userEmail || 'system',
        data.userRole || null,
        data.action,
        data.entityType || null,
        data.entityId || null,
        data.stateBefore ? JSON.stringify(data.stateBefore) : null,
        data.stateAfter ? JSON.stringify(data.stateAfter) : null,
        data.ipAddress || null,
        data.severity || 'INFO',
        data.metadata ? JSON.stringify(data.metadata) : null
    );
}

// --- MIDDLEWARE ---

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Busca usuário
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id);

    if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = user;
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!roles.includes(req.user.role)) {
            auditLog({
                userId: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.role,
                action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
                ipAddress: req.ip,
                severity: 'WARNING',
                metadata: { requiredRoles: roles, path: req.path }
            });

            return res.status(403).json({ error: 'Permissão negada' });
        }

        next();
    };
}

// Resto do arquivo continua...
module.exports = { db, auditLog, requireAuth, requireRole };
