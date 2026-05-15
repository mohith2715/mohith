process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../server');
const db = require('../database');

describe('Ideas Management System Integration Tests (AC1 - AC17)', () => {
    let submitterAgent;
    let reviewerAgent;
    let ideaId;

    beforeAll(() => {
        db.exec('DELETE FROM ratings');
        db.exec('DELETE FROM ideas');
        db.exec("DELETE FROM users WHERE email != 'reviewer@example.com'");
        
        submitterAgent = request.agent(app);
        reviewerAgent = request.agent(app);
    });

    afterAll(() => {
        db.exec('DELETE FROM ratings');
        db.exec('DELETE FROM ideas');
        db.exec("DELETE FROM users WHERE email != 'reviewer@example.com'");
    });

    test('AC1, AC2, AC3: Submitter Registration and Login', async () => {
        const resReg = await submitterAgent.post('/api/auth/register')
            .send({ email: 'test_submitter@example.com', password: 'password123' });
        console.log("Registration:", resReg.status, resReg.body);
        expect(resReg.status).toBe(201);

        const resLog = await submitterAgent.post('/api/auth/login')
            .send({ email: 'test_submitter@example.com', password: 'password123' });
        console.log("Login:", resLog.status, resLog.body);
        expect(resLog.status).toBe(200);
        expect(resLog.body.role).toBe('SUBMITTER');
    });

    test('Reviewer Login', async () => {
        const resLog = await reviewerAgent.post('/api/auth/login')
            .send({ email: 'reviewer@example.com', password: 'reviewer123' });
        console.log("Reviewer Login:", resLog.status, resLog.body);
        expect(resLog.status).toBe(200);
        expect(resLog.body.role).toBe('REVIEWER');
    });

    test('AC8: User can submit a new idea', async () => {
        const res = await submitterAgent.post('/api/ideas')
            .send({ title: 'New Tech Idea', description: 'Description here', category: 'Tech' });
        expect(res.status).toBe(201);
        expect(res.body.title).toBe('New Tech Idea');
        ideaId = res.body.id;
    });

    test('AC10: User cannot rate their own idea', async () => {
        const res = await submitterAgent.post(`/api/ideas/${ideaId}/rate`)
            .send({ rating: 5 });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Cannot rate your own idea');
    });

    test('AC9, AC11: Another user can rate the idea exactly once', async () => {
        const agent2 = request.agent(app);
        await agent2.post('/api/auth/register').send({ email: 'voter@example.com', password: 'pass' });
        await agent2.post('/api/auth/login').send({ email: 'voter@example.com', password: 'pass' });

        const resRate = await agent2.post(`/api/ideas/${ideaId}/rate`)
            .send({ rating: 4 });
        expect(resRate.status).toBe(200);
        expect(resRate.body.message).toBe('Rating saved successfully');

        const resRate2 = await agent2.post(`/api/ideas/${ideaId}/rate`)
            .send({ rating: 5 });
        expect(resRate2.status).toBe(400); // duplicate rating
    });

    test('AC14, AC15, AC16: Reviewer changes status', async () => {
        const res = await reviewerAgent.post(`/api/ideas/${ideaId}/transition`)
            .send({ status: 'Under Review', review_note: 'Looking into this' });
        expect(res.status).toBe(200);
        
        const resInvalid = await reviewerAgent.post(`/api/ideas/${ideaId}/transition`)
            .send({ status: 'Submitted', review_note: 'back to submitted' });
        expect(resInvalid.status).toBe(400); // Invalid state transition
    });

    test('AC13: Submitter cannot edit idea that is no longer Submitted', async () => {
        const res = await submitterAgent.put(`/api/ideas/${ideaId}`)
            .send({ title: 'Changed' });
        expect(res.status).toBe(400);
    });

    test('Listing ideas includes ratings and is accessible', async () => {
        const res = await submitterAgent.get('/api/ideas');
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].avg_rating).toBeDefined();
    });
});
