const { verifyToken } = require('../utils/auth');
const { auditLog } = require('../utils/audit');

// Middleware de autenticação
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

    // Busca usuário no db
    const db = req.app.locals.db;
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id);

    if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Remove senha do objeto
    delete user.password_hash;

    req.user = user;
    next();
}

// Middleware de verificação de papel
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!roles.includes(req.user.role)) {
            // Loga tentativa não autorizada
            const db = req.app.locals.db;
            auditLog(db, {
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

module.exports = { requireAuth, requireRole };
