const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'lab-lims-secret-change-in-production-2026';

// Hash de senha
function hashPassword(password) {
    return bcrypt.hashSync(password, 12);
}

// Comparar senha
function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// Gerar JWT
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

// Verificar JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Criar sessão
function createSession(db, userId, ipAddress, userAgent) {
    const sessionId = crypto.randomUUID();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const token = generateToken(user);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);

    db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt.toISOString());

    return { sessionId, token, user };
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    createSession,
    JWT_SECRET
};
