// Função de auditoria
function auditLog(db, data) {
    try {
        db.prepare(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, entity_type, entity_id, 
        state_before, state_after, ip_address, severity, metadata
      )
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
    } catch (error) {
        console.error('[AUDIT ERROR]', error);
        // Nunca deixar auditoria quebrar o sistema
    }
}

module.exports = { auditLog };
