require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const ideasRoutes = require('./routes/ideas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'super-secret-key-for-hackathon',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);

// Fallback for SPA/HTML pages
app.use((req, res) => {
    if (req.path === '/') {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
