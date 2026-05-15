const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbFile = process.env.NODE_ENV === 'test' ? 'test.db' : 'ideas.db';
const dbPath = path.resolve(__dirname, dbFile);
const db = new Database(dbPath);

function initDb() {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('SUBMITTER', 'REVIEWER')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Submitted', 'Under Review', 'Selected', 'Rejected')) DEFAULT 'Submitted',
            submitter_id INTEGER NOT NULL,
            review_note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            idea_id INTEGER NOT NULL,
            rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            UNIQUE(user_id, idea_id)
        );

        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            idea_id INTEGER NOT NULL,
            vote_type TEXT NOT NULL CHECK(vote_type IN ('UP', 'DOWN')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
            UNIQUE(user_id, idea_id)
        );
    `);

    // Seed Reviewer Account
    const checkReviewer = db.prepare('SELECT id FROM users WHERE email = ?').get('reviewer@example.com');
    if (!checkReviewer) {
        const hash = bcrypt.hashSync('reviewer123', 10);
        db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('reviewer@example.com', hash, 'REVIEWER');
        console.log('Seeded default reviewer account: reviewer@example.com / reviewer123');
    }
}

initDb();

module.exports = db;
