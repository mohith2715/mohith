const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
    const { email, password, reviewer_code } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // We default new users to 'SUBMITTER'. Reviewers are seeded/added by admins.
    let role = 'SUBMITTER';
    if (process.env.REVIEWER_CODE && reviewer_code === process.env.REVIEWER_CODE) {
        role = 'REVIEWER';
    }
    
    try {
        const hash = bcrypt.hashSync(password, 10);
        const stmt = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
        const info = stmt.run(email, hash, role);
        
        // Log user in
        req.session.userId = info.lastInsertRowid;
        req.session.role = role;
        
        res.status(201).json({ id: info.lastInsertRowid, email, role });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.userId = user.id;
        req.session.role = user.role;

        res.json({ id: user.id, email: user.email, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Get current user session
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware for checking auth
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

const requireReviewer = (req, res, next) => {
    if (!req.session.userId || req.session.role !== 'REVIEWER') {
        return res.status(403).json({ error: 'Forbidden: Reviewer access required' });
    }
    next();
};

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireReviewer = requireReviewer;
