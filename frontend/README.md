# Frontend helpers

The routed UI lives in `src/app`, with static assets in `public` and browser-safe utilities in `lib`.

Run `npm install` and `npm run dev` from this directory. API calls to `/api/...` are proxied to the backend. Set `BACKEND_URL` if the backend is not at `http://127.0.0.1:4001`; set `JWT_SECRET` to the same value configured in the backend.
