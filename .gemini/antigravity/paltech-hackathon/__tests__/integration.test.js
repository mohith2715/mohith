process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../server');
const db = require('../database');
const bcrypt = require('bcrypt');

describe('Ideas Management System - Full Acceptance Testing (AC1-AC17)', () => {
    let submitter1; // User A
    let submitter2; // User B
    let reviewer;   // Reviewer
    let ideaId;

    beforeAll(async () => {
        // Clear tables
        db.exec('DELETE FROM ratings');
        db.exec('DELETE FROM ideas');
        db.exec("DELETE FROM users WHERE email != 'reviewer@example.com'");
        
        submitter1 = request.agent(app);
        submitter2 = request.agent(app);
        reviewer = request.agent(app);

        // Ensure reviewer is logged in
        await reviewer.post('/api/auth/login').send({ email: 'reviewer@example.com', password: 'reviewer123' });
    });

    afterAll(() => {
        // Optional: keep test.db for inspection if needed, or clear it
    });

    test('AC1: Registration, Logout, and Login with Hashed Password', async () => {
        // Register
        const resReg = await submitter1.post('/api/auth/register')
            .send({ email: 'user1@example.com', password: 'password123' });
        expect(resReg.status).toBe(201);

        // Verify password hashing in DB
        const userInDb = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('user1@example.com');
        expect(userInDb.password_hash).not.toBe('password123');
        expect(bcrypt.compareSync('password123', userInDb.password_hash)).toBe(true);

        // Logout
        await submitter1.post('/api/auth/logout');

        // Login
        const resLog = await submitter1.post('/api/auth/login')
            .send({ email: 'user1@example.com', password: 'password123' });
        expect(resLog.status).toBe(200);
        expect(resLog.body.email).toBe('user1@example.com');
    });

    test('AC2: Protected access is blocked for unauthenticated users', async () => {
        const anonymous = request(app);
        const res = await anonymous.get('/api/ideas');
        expect(res.status).toBe(401);
    });

    test('AC3: Create an idea and view its details', async () => {
        const resCreate = await submitter1.post('/api/ideas')
            .send({ title: 'Acceptance Idea', description: 'Testing details', category: 'Tech' });
        expect(resCreate.status).toBe(201);
        ideaId = resCreate.body.id;

        const resDetail = await submitter1.get(`/api/ideas/${ideaId}`);
        expect(resDetail.status).toBe(200);
        expect(resDetail.body.title).toBe('Acceptance Idea');
    });

    test('AC4, AC5: Rate another user’s idea and block self-rating', async () => {
        // Self rating (Submitter 1 owns ideaId)
        const resSelf = await submitter1.post(`/api/ideas/${ideaId}/rate`).send({ rating: 5 });
        expect(resSelf.status).toBe(400);
        expect(resSelf.body.error).toBe('Cannot rate your own idea');

        // Rate by User 2
        await submitter2.post('/api/auth/register').send({ email: 'user2@example.com', password: 'password123' });
        await submitter2.post('/api/auth/login').send({ email: 'user2@example.com', password: 'password123' });
        
        const resRate = await submitter2.post(`/api/ideas/${ideaId}/rate`).send({ rating: 4 });
        expect(resRate.status).toBe(200);

        // Verify aggregate
        const resIdea = await submitter1.get(`/api/ideas/${ideaId}`);
        expect(resIdea.body.avg_rating).toBe(4);
        expect(resIdea.body.rating_count).toBe(1);
    });

    test('AC6: Update existing rating without increasing count', async () => {
        // Update User 2's rating from 4 to 5
        const resUpdate = await submitter2.post(`/api/ideas/${ideaId}/rate`).send({ rating: 5 });
        expect(resUpdate.status).toBe(200);

        const resIdea = await submitter1.get(`/api/ideas/${ideaId}`);
        expect(resIdea.body.avg_rating).toBe(5);
        expect(resIdea.body.rating_count).toBe(1); // Still 1
    });

    test('AC7: Remove rating and update aggregates', async () => {
        const resRemove = await submitter2.delete(`/api/ideas/${ideaId}/rate`);
        expect(resRemove.status).toBe(200);

        const resIdea = await submitter1.get(`/api/ideas/${ideaId}`);
        expect(resIdea.body.avg_rating).toBe(0);
        expect(resIdea.body.rating_count).toBe(0);
    });

    test('AC8, AC9: Reviewer transitions and permission check', async () => {
        // User 1 tries reviewer action
        const resForbidden = await submitter1.post(`/api/ideas/${ideaId}/transition`)
            .send({ status: 'Under Review' });
        expect(resForbidden.status).toBe(403);

        // Reviewer transitions correctly
        const resOk = await reviewer.post(`/api/ideas/${ideaId}/transition`)
            .send({ status: 'Under Review', review_note: 'Legit' });
        expect(resOk.status).toBe(200);

        const resIdea = await reviewer.get(`/api/ideas/${ideaId}`);
        expect(resIdea.body.status).toBe('Under Review');
    });

    test('AC11: Review note visible', async () => {
        // Move to Selected first
        await reviewer.post(`/api/ideas/${ideaId}/transition`)
            .send({ status: 'Selected', review_note: 'Hired!' });

        const resIdea = await submitter1.get(`/api/ideas/${ideaId}`);
        expect(resIdea.body.review_note).toBe('Hired!');
    });

    test('AC10: Edit blocked after final state, but Delete allowed', async () => {
        // Try to edit
        const resEdit = await submitter1.put(`/api/ideas/${ideaId}`).send({ title: 'New Title' });
        expect(resEdit.status).toBe(400);

        // Deletion is now BLOCKED for submitters in final states
        const resDelete = await submitter1.delete(`/api/ideas/${ideaId}`);
        expect(resDelete.status).toBe(400);
        expect(resDelete.body.error).toContain('Cannot delete');

        // But ALLOWED for reviewers
        const resDeleteReviewer = await reviewer.delete(`/api/ideas/${ideaId}`);
        expect(resDeleteReviewer.status).toBe(200);
    });

    test('AC12, AC13, AC14: Filtering, Searching, and Sorting', async () => {
        // Seed more data
        await submitter1.post('/api/ideas').send({ title: 'Acceptance Idea', description: 'desc', category: 'Tech' });
        await submitter1.post('/api/ideas').send({ title: 'Beta Idea', description: 'desc', category: 'Process' });
        await submitter1.post('/api/ideas').send({ title: 'Gamma Idea', description: 'desc', category: 'Tech' });

        // Search
        const resSearch = await submitter1.get('/api/ideas?search=Beta');
        expect(resSearch.body.data.length).toBe(1);
        expect(resSearch.body.data[0].title).toBe('Beta Idea');

        // Filter
        const resFilter = await submitter1.get('/api/ideas?category=Process');
        expect(resFilter.body.data.length).toBe(1);

        // Combine
        const resCombo = await submitter1.get('/api/ideas?category=Tech&search=Acceptance');
        expect(resCombo.body.data.length).toBe(1);
        expect(resCombo.body.data[0].title).toBe('Acceptance Idea');
    });

    test('AC15: Pagination', async () => {
        // Seed 15 ideas to ensure we have at least 2 pages
        for (let i = 0; i < 15; i++) {
            await submitter1.post('/api/ideas').send({ title: `Idea ${i}`, description: 'p', category: 'Tech' });
        }
        
        const resPage1 = await submitter1.get('/api/ideas?page=1');
        expect(resPage1.body.data.length).toBe(10); // DEFAULT_LIMIT in ideas.js is 10
        
        const resPage2 = await submitter1.get('/api/ideas?page=2');
        expect(resPage2.body.data.length).toBeGreaterThan(0);
        expect(resPage2.body.pagination.page).toBe(2);
    });

    test('AC16: Clear validation errors (Handled via API response codes)', async () => {
        const res = await submitter1.post('/api/ideas').send({ title: '', description: '' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    test('AC17: Data survives restart', async () => {
        // Since we are using better-sqlite3 with a file, we just need to verify the count.
        // Opening another connection to the same file verifies it's persisted on disk.
        const countBefore = db.prepare('SELECT COUNT(*) as count FROM ideas').get().count;
        expect(countBefore).toBeGreaterThan(0);
        
        // Use the absolute path or relative to project root
        const Database = require('better-sqlite3');
        const db2 = new Database('test.db'); // In root
        const countAfter = db2.prepare('SELECT COUNT(*) as count FROM ideas').get().count;
        expect(countAfter).toBe(countBefore);
        db2.close();
    });
});
