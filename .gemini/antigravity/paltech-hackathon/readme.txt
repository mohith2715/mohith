# Ideas Management System

An internal tool for Paltech to gather, review, and select innovative project ideas from employees.

## Setup & Run Instructions

This project is designed to run locally in under 2 minutes with zero external dependencies.

**Prerequisites:**
- Node.js (v18+ recommended)
- npm

**Steps:**
1. Clone the repository and navigate to the project directory:
   `cd paltech-hackathon`
2. Install dependencies:
   `npm install`
3. Set up the environment variables:
   Create a `.env` file in the root directory and add the following line:
   `REVIEWER_CODE=REVIEW`
   *(This code is used to grant reviewer privileges during registration).*
4. Start the application:
   `npm run dev`
5. Open your browser and navigate to `http://localhost:3000`.

## Tech Stack & Rationale

*   **Backend Core**: Node.js with Express. Express was chosen for its minimal footprint and rapid API routing capabilities.
*   **Storage Layer**: `better-sqlite3` (SQLite). 
    *   *Rationale*: For a hackathon timeline, a zero-configuration, file-based database is the most efficient choice. `better-sqlite3` is extremely fast, synchronous, and doesn't require reviewers to install PostgreSQL or MongoDB to run the app locally.
*   **Authentication & Hashing**: `express-session` and `bcrypt`.
    *   *Rationale*: Server-side sessions via `express-session` provide robust security without the overhead of implementing secure JWT storage on the client. `bcrypt` (cost factor 10) is the industry standard for password hashing, natively handling salting to protect against rainbow table attacks.
*   **Frontend**: Vanilla HTML/JS with Tailwind CSS (via CDN).
    *   *Rationale*: Avoided complex build pipelines (like Webpack/Vite/React) to guarantee the project runs instantly out-of-the-box. Tailwind provides a premium UI quickly without writing massive CSS files.

## Architectural Overview

The application follows a standard monolithic Model-View-Controller (MVC-lite) pattern:

*   **`/public/` (View Layer)**: Contains static HTML, CSS, and vanilla JS (`app.js`). This layer communicates with the backend via standard REST API `fetch` calls.
*   **`/routes/` (Controller Layer)**: 
    *   `auth.js`: Handles registration, login, logout, and session establishment.
    *   `ideas.js`: Handles all CRUD operations, status transitions, and rating logic for ideas.
*   **`database.js` (Model Layer)**: A singleton module that initializes the SQLite database, runs migrations (creating tables if they don't exist), and exports the database instance.
*   **`server.js`**: The entry point that wires up middleware (JSON parsing, sessions, static file serving) and mounts the routers.
*   **`/__tests__/`**: Contains Jest integration tests verifying business logic.

## How AI Tools Were Used

*   **Primary Assistant**: DeepMind's Gemini was used as the autonomous agentic coding assistant to write the backend API, database schemas, integration tests, and UI wiring.
*   **Frontend Generation**: The Stitch MCP server was utilized to generate the initial HTML/Tailwind layouts based on premium design requirements (glassmorphism, modern typography).
*   **Human-AI Collaboration**: 
    *   *AI-Generated*: The database schema, API routes, authentication logic, and custom global modal system.
    *   *AI-Assisted*: The frontend `app.js` logic was heavily assisted by AI, wiring up the generated HTML to the backend endpoints.
    *   *Human-Reviewed/Directed*: The human developer (User) provided the core architectural direction, prioritized features, spotted UI bugs (e.g., fast-disappearing modals), and enforced business logic constraints (e.g., submitters cannot delete finalized ideas). 
    *   *Surprises*: Integrating complex DOM manipulation (like dynamic rating stars) with AI required careful context management to prevent selector collisions.

## Assumptions

*   **Reviewer Seeding**: We assumed it was acceptable for reviewers to gain their role by entering a secret code (`REVIEWER_CODE`) during standard registration, rather than building a separate, complex Admin Invitation system.
*   **Environment**: Assumed a local, single-node environment. SQLite and in-memory `express-session` are not horizontally scalable but perfectly fit the scope.
*   **User Uniqueness**: Email addresses are assumed to be the unique identifier for all users.

## Trade-offs

Given the time constraints, the following deliberate trade-offs were made:
*   **No Build Step / SPA Framework**: Dropped React/Next.js in favor of Vanilla JS and CDN Tailwind. This sacrificed some component reusability but eliminated configuration overhead and guaranteed simple reviewer setup.
*   **Basic Session Storage**: Used the default in-memory store for `express-session`. In production, this would cause users to be logged out whenever the server restarts.
*   **Password Reset**: Deprioritized the "Forgot Password" flow as it requires an email service integration (e.g., SendGrid) which is out of scope for a prototype.

## Future Work

If given more time, the following improvements would be prioritized:
1.  **Database Migration**: Migrate from SQLite to PostgreSQL and use a robust ORM like Prisma.
2.  **Session Persistence**: Integrate Redis or connect `express-session` to the database to persist logins across server restarts.
3.  **UI Componentization**: Migrate the vanilla HTML/JS to a framework like React or Vue for better maintainability.
4.  **Admin Dashboard**: Create a dedicated view for Admins to manage users, reset passwords, and configure the application (e.g., changing the Reviewer Code dynamically).
5.  **Notifications**: Implement email notifications for submitters when their idea status changes.
