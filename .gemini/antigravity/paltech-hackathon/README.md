# Ideas Management System

An end-to-end web application for submitting, reviewing, and tracking organizational ideas, built using Node.js, Express, SQLite, and Stitch MCP.

## Setup and Run Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run the Development Server:**
   ```bash
   npm run dev
   ```

3. **Run Tests:**
   ```bash
   npm test
   ```

4. **Access the App:**
   Open `http://localhost:3000` in your browser.
   - **Submitter Account:** Register a new account via the UI.
   - **Reviewer Account:** Use the pre-seeded account `reviewer@example.com` with password `reviewer123`.

## Tech Stack and Rationale

*   **Backend:** Node.js with Express. Chosen for its simplicity, speed, and standard HTTP handling which perfectly matches REST API paradigms.
*   **Database:** SQLite (`better-sqlite3`). Chosen because it perfectly satisfies the requirement for a local file-based, persistent database without complex infrastructure overhead. 
*   **Authentication:** `express-session` and `bcrypt`. Chosen to ensure robust, stateful, session-based authentication. Passwords are one-way hashed to prevent raw data exposure.
*   **Frontend UI:** Generated using **Stitch MCP** following the "Professional Clarity" design system. The static designs were then wired via vanilla Javascript (`app.js`) to consume the backend APIs dynamically.
*   **Testing:** Jest and Supertest. Chosen to ensure integration testing across the entire API stack.

## Architecture Overview

The system follows a classic client-server, monolithic architecture:
1.  **Client:** The frontend is served statically from the `public/` directory, consisting of HTML/CSS generated via Stitch and a custom `app.js` handler.
2.  **API Layer:** The Express routes (`/api/auth`, `/api/ideas`) act as the boundary, implementing validation, parsing inputs, and ensuring session authorization.
3.  **Data Access:** Queries are directly mapped to SQLite tables via `database.js`. Referential integrity is enforced at the database level using `FOREIGN KEY` and `ON DELETE CASCADE`.

## How AI Tools Were Used

*   **Antigravity Agent:** Used as the primary architect and developer to structure the codebase, implement REST APIs securely, design the SQL schema, and ensure robust integration tests.
*   **Stitch MCP:** Instructed by the agent to iteratively generate the UI screens (Login, Registration, Idea List, Idea Detail, and Submission) adhering strictly to a professional design language.

## Assumptions

*   "Users" and "Reviewers" are the only roles.
*   A user can rate an idea exactly once. Subsequent attempts to rate the same idea by the same user will be rejected.
*   The system uses an in-memory test database for automated testing to prevent polluting the persistent data file.

## Trade-offs

*   **Session vs JWT:** Sessions require server-side memory to track logged-in users, making horizontal scaling slightly more complex, but they offer easier server-side invalidation and simpler setup for this scope.
*   **Static HTML with Vanilla JS vs React:** Relying on vanilla JS limits frontend complexity but massively reduces setup time, bundle sizes, and fulfills the requirement to wire directly generated MCP UI output without massive refactoring.

## Future Work

*   Implement a robust frontend framework (React/Vue) for better component isolation.
*   Implement JWT-based authentication for scalable microservices.
*   Add email notifications for status transitions.
*   Support file attachments for ideas.
