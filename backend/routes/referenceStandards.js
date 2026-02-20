const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

// Note: db is injected via app.locals in app.js
// We can access it in routes via req.app.locals.db

// --- REFERENCE STANDARDS ---

// GET All Reference Standards
router.get('/', requireAuth, (req, res) => {
    const db = req.app.locals.db;
    try {
        const standards = db.prepare('SELECT * FROM reference_standards ORDER BY name ASC').all();
        res.json(standards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar normas de referência' });
    }
});

// GET Single Standard with its rules
router.get('/:id', requireAuth, (req, res) => {
    const db = req.app.locals.db;
    try {
        const standard = db.prepare('SELECT * FROM reference_standards WHERE id = ?').get(req.params.id);
        if (!standard) return res.status(404).json({ error: 'Norma não encontrada' });

        const rules = db.prepare('SELECT * FROM reference_standard_rules WHERE standard_id = ?').all(req.params.id);

        res.json({ ...standard, rules });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar norma de referência' });
    }
});

// POST Create new Standard
router.post('/', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;
    const { name, description, category, is_active } = req.body;

    if (!name) return res.status(400).json({ error: 'O nome da norma é obrigatório.' });

    try {
        const info = db.prepare(`
      INSERT INTO reference_standards (name, description, category, is_active)
      VALUES (?, ?, ?, ?)
    `).run(name, description, category, is_active === undefined ? 1 : is_active);

        res.status(201).json({ id: info.lastInsertRowid, message: 'Norma criada com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar norma de referência' });
    }
});

// PATCH Update Standard
router.patch('/:id', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;
    const updates = req.body;

    // Nao atualizamos regras aqui, apenas o cabecalho. Regras serao feitas via outro endpoint ou array aninhado.
    const allowed = ['name', 'description', 'category', 'is_active'];
    const keys = Object.keys(updates).filter(k => allowed.includes(k));

    if (keys.length === 0) return res.status(400).json({ error: 'Sem campos válidos' });

    const fields = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(req.params.id);

    try {
        const info = db.prepare(`UPDATE reference_standards SET ${fields} WHERE id = ?`).run(...values);
        if (info.changes === 0) return res.status(404).json({ error: 'Norma não encontrada' });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar norma' });
    }
});

// DELETE Standard
router.delete('/:id', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;
    try {
        const info = db.prepare('DELETE FROM reference_standards WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Norma não encontrada' });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir norma' });
    }
});


// --- REFERENCE STANDARD RULES ---

// POST Create Rule or Update many
router.post('/:id/rules', requireAuth, requireRole('ADMIN', 'PROFESSOR'), (req, res) => {
    const db = req.app.locals.db;
    const standard_id = req.params.id;
    const { rules } = req.body; // Expects an array of rules to REPLACE existing ones

    if (!Array.isArray(rules)) return res.status(400).json({ error: 'Formato inválido. Esperado array de regras.' });

    try {
        const tx = db.transaction(() => {
            // First, delete old rules
            db.prepare('DELETE FROM reference_standard_rules WHERE standard_id = ?').run(standard_id);

            // Then insert new ones
            const insert = db.prepare(`
        INSERT INTO reference_standard_rules (
          standard_id, parameter_key, condition_type, min_value, max_value, expected_text, display_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

            for (const r of rules) {
                insert.run(
                    standard_id,
                    r.parameter_key,
                    r.condition_type,
                    r.min_value !== undefined ? r.min_value : null,
                    r.max_value !== undefined ? r.max_value : null,
                    r.expected_text || null,
                    r.display_reference || null
                );
            }
        });

        tx();
        res.json({ success: true, message: 'Regras salvas com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar regras' });
    }
});

module.exports = router;
