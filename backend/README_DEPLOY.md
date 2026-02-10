# Deploying the backend

This document explains quick ways to deploy the backend to common hosting providers.

Prerequisites
- A GitHub repo (already present)
- A secret value for `JWT_SECRET` (store it in the host's env settings)

Recommended easy option: Railway
1. Go to https://railway.app and sign up (GitHub recommended).
2. Create a new project → Deploy from GitHub.
3. Select this repository and choose the `backend/` subdirectory as the root.
4. In Railway's Environment settings add `JWT_SECRET` with a long random value.
5. Railway will detect `package.json` and run `npm install` then `npm start`.

Other options
- Render: Create a Web Service, connect the repository and set the root directory to `backend/`. Use `npm start` as the start command and set `JWT_SECRET` under Environment.
- Fly.io: Use the provided `Dockerfile` — `fly launch` from the `backend/` folder and set env var `JWT_SECRET`.

Local testing
1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Run `npm install` in `backend/` and `node server.js` (or `npm run dev`).
