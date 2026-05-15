const express = require('express');
const db = require('../database');
const { requireAuth, requireReviewer } = require('./auth');

const router = express.Router();

// Get list of ideas with filtering, search, sorting, pagination
router.get('/', requireAuth, (req, res) => {
    let { search, category, status, sortBy, sortDir, page, limit, mine } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
        SELECT i.*, 
               u.email as submitter_email,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(r.id) as rating_count
        FROM ideas i
        JOIN users u ON i.submitter_id = u.id
        LEFT JOIN ratings r ON i.id = r.idea_id
        WHERE 1=1
    `;
    const params = [];

    if (search) {
        query += ` AND i.title LIKE ?`;
        params.push(`%${search}%`);
    }
    if (category && category !== 'Category') {
        query += ` AND LOWER(i.category) = LOWER(?)`;
        params.push(category);
    }
    if (status && status !== 'Status') {
        query += ` AND LOWER(i.status) = LOWER(?)`;
        params.push(status);
    }
    if (mine === 'true') {
        query += ` AND i.submitter_id = ?`;
        params.push(req.session.userId);
    }

    query += ` GROUP BY i.id`;

    // Sorting
    const allowedSortBy = ['created_at', 'avg_rating', 'rating_count'];
    const allowedSortDir = ['asc', 'desc'];
    
    sortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    sortDir = allowedSortDir.includes(sortDir?.toLowerCase()) ? sortDir.toLowerCase() : 'desc';

    query += ` ORDER BY ${sortBy} ${sortDir}`;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        const rows = db.prepare(query).all(...params);
        
        // Count query for total pages
        let countQuery = `SELECT COUNT(DISTINCT i.id) as total FROM ideas i WHERE 1=1`;
        const countParams = [];
        if (search) { countQuery += ` AND i.title LIKE ?`; countParams.push(`%${search}%`); }
        if (category && category !== 'Category') { countQuery += ` AND LOWER(i.category) = LOWER(?)`; countParams.push(category); }
        if (status && status !== 'Status') { countQuery += ` AND LOWER(i.status) = LOWER(?)`; countParams.push(status); }
        if (mine === 'true') { countQuery += ` AND i.submitter_id = ?`; countParams.push(req.session.userId); }
        
        const totalRows = db.prepare(countQuery).get(...countParams).total;
        
        res.json({
            data: rows,
            pagination: {
                page,
                limit,
                total: totalRows,
                totalPages: Math.ceil(totalRows / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single idea
router.get('/:id', (req, res) => {
    try {
        const idea = db.prepare(`
            SELECT i.*, 
                   u.email as submitter_email,
                   COALESCE(AVG(r.rating), 0) as avg_rating,
                   COUNT(r.id) as rating_count
            FROM ideas i
            JOIN users u ON i.submitter_id = u.id
            LEFT JOIN ratings r ON i.id = r.idea_id
            WHERE i.id = ?
            GROUP BY i.id
        `).get(req.params.id);

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }
        res.json(idea);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create idea
router.post('/', requireAuth, (req, res) => {
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    try {
        const stmt = db.prepare('INSERT INTO ideas (title, description, category, submitter_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(title, description, category, req.session.userId);
        res.status(201).json({ id: info.lastInsertRowid, title, description, category, status: 'Submitted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Edit idea
router.put('/:id', requireAuth, (req, res) => {
    const { title, description, category } = req.body;
    const ideaId = req.params.id;

    if (!title || !description || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    try {
        const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(ideaId);
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        if (idea.submitter_id !== req.session.userId) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own ideas' });
        }

        if (idea.status === 'Selected' || idea.status === 'Rejected') {
            return res.status(400).json({ error: 'Cannot edit an idea that has been Selected or Rejected' });
        }

        const stmt = db.prepare('UPDATE ideas SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(title, description, category, ideaId);
        res.json({ message: 'Idea updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete idea
router.delete('/:id', requireAuth, (req, res) => {
    const ideaId = req.params.id;

    try {
        const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(ideaId);
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        if (idea.submitter_id !== req.session.userId && req.session.role !== 'REVIEWER') {
            return res.status(403).json({ error: 'Forbidden: You can only delete your own ideas' });
        }

        if (idea.status === 'Selected' || idea.status === 'Rejected') {
            return res.status(400).json({ error: 'Cannot delete an idea that has been Selected or Rejected' });
        }

        db.prepare('DELETE FROM ideas WHERE id = ?').run(ideaId);
        res.json({ message: 'Idea deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rate idea
router.post('/:id/rate', requireAuth, (req, res) => {
    const ideaId = req.params.id;
    const { rating } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    try {
        const idea = db.prepare('SELECT submitter_id FROM ideas WHERE id = ?').get(ideaId);
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        if (idea.submitter_id === req.session.userId) {
            return res.status(400).json({ error: 'Cannot rate your own idea' });
        }

        const stmt = db.prepare(`
            INSERT INTO ratings (user_id, idea_id, rating) 
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, idea_id) DO UPDATE SET rating = excluded.rating
        `);
        stmt.run(req.session.userId, ideaId, rating);
        res.json({ message: 'Rating saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove rating
router.delete('/:id/rate', requireAuth, (req, res) => {
    const ideaId = req.params.id;

    try {
        db.prepare('DELETE FROM ratings WHERE user_id = ? AND idea_id = ?').run(req.session.userId, ideaId);
        res.json({ message: 'Rating removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reviewer Transition
router.post('/:id/transition', requireReviewer, (req, res) => {
    const ideaId = req.params.id;
    const { status, review_note } = req.body;

    const validStatuses = ['Submitted', 'Under Review', 'Selected', 'Rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const idea = db.prepare('SELECT status FROM ideas WHERE id = ?').get(ideaId);
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        const currentStatus = idea.status;
        const allowedTransitions = {
            'Submitted': ['Under Review', 'Rejected'],
            'Under Review': ['Selected', 'Rejected'],
            'Selected': [],
            'Rejected': []
        };

        if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(status)) {
            return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${status}` });
        }

        const stmt = db.prepare('UPDATE ideas SET status = ?, review_note = COALESCE(?, review_note), updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(status, review_note || null, ideaId);
        res.json({ message: `Idea transitioned to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
