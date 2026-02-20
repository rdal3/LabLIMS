const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET all parameter methods
router.get('/', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const methods = db.prepare('SELECT * FROM parameter_methods').all();
        res.json(methods);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar metodologias' });
    }
});

// GET single parameter method by parameter_key
router.get('/:parameter_key', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const method = db.prepare('SELECT * FROM parameter_methods WHERE parameter_key = ?').get(req.params.parameter_key);

        if (!method) {
            return res.status(404).json({ error: 'Configuração não encontrada para este parâmetro' });
        }
        res.json(method);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar metodologia' });
    }
});

// PUT parameter method (Upsert - Cria ou Atualiza)
router.put('/:parameter_key', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const { parameter_key } = req.params;
        const { method_name, ld, lq, equipment } = req.body;

        const existing = db.prepare('SELECT id FROM parameter_methods WHERE parameter_key = ?').get(parameter_key);

        if (existing) {
            // Atualiza
            const stmt = db.prepare(`
                UPDATE parameter_methods 
                SET method_name = ?, ld = ?, lq = ?, equipment = ? 
                WHERE parameter_key = ?
            `);
            stmt.run(method_name, ld, lq, equipment, parameter_key);
        } else {
            // Cria
            const stmt = db.prepare(`
                INSERT INTO parameter_methods (parameter_key, method_name, ld, lq, equipment)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run(parameter_key, method_name, ld, lq, equipment);
        }

        res.json({ msg: 'Metodologia salva com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar metodologia' });
    }
});

module.exports = router;
