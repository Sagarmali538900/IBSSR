# Backend services

Server-only infrastructure and domain services live here: database connection and models, authentication, scoring, report generation, email, and object storage.

HTTP endpoints live in `app/api` in this independent Next.js project. They call the server services and keep the existing request and response contracts.

Run `npm install` and `npm run dev` from this directory. The API listens on port 4001. Copy `.env.example` to `.env.local` and configure `MONGODB_URI`, `JWT_SECRET`, and optional email and blob credentials. Check the database connection at `http://127.0.0.1:4001/api/health/db`.

Password reset links require `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` in production. Without SMTP, development prints the one-time reset URL in the backend terminal. Links expire after one hour and are single-use.
