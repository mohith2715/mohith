const express = require('express');
const db = require('../database');
const sanitizeHtml = require('sanitize-html');
const { requireAuth, requireReviewer } = require('./auth');

const router = express.Router();

// Sanitize rich text HTML — allow safe formatting only
function sanitizeDescription(html) {
    return sanitizeHtml(html, {
        allowedTags: ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
                      'h1', 'h2', 'h3', 'a', 'blockquote', 'pre', 'code', 'span'],
        allowedAttributes: {
            'a': ['href', 'target', 'rel'],
            'span': ['style'],
            'p': ['class'],
            'li': ['class']
        },
        allowedStyles: {
            'span': { 'text-decoration': [/^underline$/] }
        }
    });
}

// Check if HTML has actual text content (not just empty tags)
function hasTextContent(html) {
    const stripped = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
    return stripped.length > 0;
}

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
               COUNT(r.id) as rating_count,
               (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND vote_type = 'UP') as upvotes,
               (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND vote_type = 'DOWN') as downvotes
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
                   COUNT(r.id) as rating_count,
                   (SELECT rating FROM ratings WHERE idea_id = i.id AND user_id = ?) as user_rating,
                   (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND vote_type = 'UP') as upvotes,
                   (SELECT COUNT(*) FROM votes WHERE idea_id = i.id AND vote_type = 'DOWN') as downvotes,
                   (SELECT vote_type FROM votes WHERE idea_id = i.id AND user_id = ?) as user_vote
            FROM ideas i
            JOIN users u ON i.submitter_id = u.id
            LEFT JOIN ratings r ON i.id = r.idea_id
            WHERE i.id = ?
            GROUP BY i.id
        `).get(req.session.userId, req.session.userId, req.params.id);

        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }
        res.json(idea);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Rate Limiter for Idea Creation ---
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const creationTimestamps = new Map(); // userId -> [timestamps]

function ideaCreationRateLimit(req, res, next) {
    const userId = req.session.userId;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Get and prune old timestamps
    let timestamps = creationTimestamps.get(userId) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    creationTimestamps.set(userId, timestamps);

    if (timestamps.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({
            error: 'Idea creation limit exceeded. Please wait before submitting more ideas.'
        });
    }

    // Record this attempt (will be counted even if validation fails downstream — acceptable trade-off)
    timestamps.push(now);
    creationTimestamps.set(userId, timestamps);
    next();
}

// Expose for testing — allows resetting the rate limiter between tests
router._creationTimestamps = creationTimestamps;

// Create idea
router.post('/', requireAuth, ideaCreationRateLimit, (req, res) => {
    const { title, description, category } = req.body;
    if (!title || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Sanitize and validate description
    const cleanDesc = description ? sanitizeDescription(description) : '';
    if (!hasTextContent(cleanDesc)) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    try {
        const stmt = db.prepare('INSERT INTO ideas (title, description, category, submitter_id) VALUES (?, ?, ?, ?)');
        const info = stmt.run(title, cleanDesc, category, req.session.userId);
        res.status(201).json({ id: info.lastInsertRowid, title, description: cleanDesc, category, status: 'Submitted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Edit idea
router.put('/:id', requireAuth, (req, res) => {
    const { title, description, category } = req.body;
    const ideaId = req.params.id;

    if (!title || !category) {
        return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Sanitize and validate description
    const cleanDesc = description ? sanitizeDescription(description) : '';
    if (!hasTextContent(cleanDesc)) {
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
        stmt.run(title, cleanDesc, category, ideaId);
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

        // Restriction: Submitter cannot delete Selected or Rejected ideas
        const finalStatuses = ['Selected', 'Rejected'];
        if (req.session.role !== 'REVIEWER' && finalStatuses.includes(idea.status)) {
            return res.status(400).json({ error: `Cannot delete an idea that has been ${idea.status}` });
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

// Vote on idea (upvote / downvote)
router.post('/:id/vote', requireAuth, (req, res) => {
    const ideaId = req.params.id;
    const { voteType } = req.body;

    if (!['UP', 'DOWN'].includes(voteType)) {
        return res.status(400).json({ error: 'voteType must be UP or DOWN' });
    }

    try {
        const idea = db.prepare('SELECT submitter_id FROM ideas WHERE id = ?').get(ideaId);
        if (!idea) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        if (idea.submitter_id === req.session.userId) {
            return res.status(400).json({ error: 'Cannot vote on your own idea' });
        }

        // Check for existing vote
        const existingVote = db.prepare('SELECT * FROM votes WHERE user_id = ? AND idea_id = ?').get(req.session.userId, ideaId);

        if (existingVote) {
            if (existingVote.vote_type === voteType) {
                // Same vote again — toggle off (remove)
                db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
                return res.json({ message: 'Vote removed', action: 'removed' });
            } else {
                // Different vote — switch direction
                db.prepare('UPDATE votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
                return res.json({ message: 'Vote switched', action: 'switched' });
            }
        } else {
            // New vote
            db.prepare('INSERT INTO votes (user_id, idea_id, vote_type) VALUES (?, ?, ?)').run(req.session.userId, ideaId, voteType);
            return res.json({ message: 'Vote recorded', action: 'created' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove vote
router.delete('/:id/vote', requireAuth, (req, res) => {
    const ideaId = req.params.id;

    try {
        db.prepare('DELETE FROM votes WHERE user_id = ? AND idea_id = ?').run(req.session.userId, ideaId);
        res.json({ message: 'Vote removed successfully' });
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
