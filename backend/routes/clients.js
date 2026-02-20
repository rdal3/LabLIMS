const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET all clients
router.get('/', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
        res.json(clients);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// GET single client
router.get('/:id', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        res.json(client);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

// POST new client
router.post('/', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const { name, cnpj_cpf, contact_name, phone, email, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'O nome do cliente é obrigatório' });
        }

        const stmt = db.prepare(`
            INSERT INTO clients (name, cnpj_cpf, contact_name, phone, email, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(name, cnpj_cpf, contact_name, phone, email, address);

        res.status(201).json({
            id: info.lastInsertRowid,
            msg: 'Cliente criado com sucesso'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar cliente. Verifique se os dados estão corretos.' });
    }
});

// PATCH update client
router.patch('/:id', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['name', 'cnpj_cpf', 'contact_name', 'phone', 'email', 'address'];
        const keys = Object.keys(updates).filter(key => allowedFields.includes(key));

        if (keys.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
        }

        const fields = keys.map(key => `${key} = ?`).join(', ');
        const values = keys.map(key => updates[key]);
        values.push(id);

        const stmt = db.prepare(`UPDATE clients SET ${fields} WHERE id = ?`);
        const info = stmt.run(...values);

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json({ msg: 'Cliente atualizado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// DELETE client
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const { db } = req.app.locals;
        const info = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json({ msg: 'Cliente deletado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
});

module.exports = router;
