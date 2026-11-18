# IBSSR Assessment Portal

An assessment management portal for administrators and franchise partners, with a candidate access-code intake and examination flow.

## Run the frontend and backend independently

Install and start the backend in one terminal:

```bash
cd backend
npm install
npm run dev
```

Install and start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`; the backend API runs at `http://localhost:4001`. Copy each folder's `.env.example` to `.env.local` and configure it. Set the same `JWT_SECRET` in both folders. The backend `.env.local` holds `MONGODB_URI`, email, and blob credentials. Check MongoDB readiness at `http://127.0.0.1:4001/api/health/db`.

## Frontend and backend boundaries

- **Frontend:** the complete Next.js project, including route pages, layouts, UI components, and static assets, lives in `frontend/`.
- **Backend:** the independent Next.js API project, server-only database, authentication, scoring, report, email, and storage services live in `backend/`.
- **HTTP API:** endpoints live in `backend/app/api`; the frontend proxies its existing `/api/...` requests to the backend so browser URLs and request/response contracts remain the same.

The two apps have separate dependencies, configuration, and run commands. The frontend and backend need to be running at the same time for the portal's API-backed workflows.

## Existing workflows

- Candidates enter an assessment code, register, read the instructions, complete sections, and receive a result.
- Administrators and partners manage assessments and assignments, review results, and use the available reporting tools.
- Administrators can also manage partners and storage.
- Admins can request a one-time password reset link from the login page. Configure SMTP in `backend/.env.local`; in development without SMTP, the reset URL is printed in the backend terminal.

The corresponding screens remain under `/candidate/...` and `/admin/...`; API endpoints remain under `/api/...`.
