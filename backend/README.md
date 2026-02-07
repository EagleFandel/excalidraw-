# Excalidraw+ Backend

This backend provides auth, personal/team file APIs, and basic team management.

## Tech Stack

- Express + TypeScript
- Prisma + PostgreSQL
- JWT (HttpOnly Cookie)
- Argon2 password hashing

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Update `DATABASE_URL`, `JWT_SECRET`, and cookie/CORS settings.

3. Install dependencies from repo root:

```bash
yarn install
```

4. Generate Prisma client and run migrations:

```bash
yarn --cwd backend prisma:generate
yarn --cwd backend prisma:migrate --name init_users
yarn --cwd backend prisma:migrate --name add_files
yarn --cwd backend prisma:migrate --name add_teams_and_file_lifecycle
```

5. Start backend:

```bash
yarn start:backend
```

Server default: `http://localhost:3005`

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /files?scope=personal|team`
- `POST /files`
- `GET /files/:id`
- `PUT /files/:id`
- `DELETE /files/:id`
- `POST /files/:id/restore`
- `DELETE /files/:id/permanent`
- `PATCH /files/:id/favorite`
- `GET /teams`
- `POST /teams`
- `GET /teams/:id/members`
- `POST /teams/:id/members`
- `PATCH /teams/:id/members/:userId`
- `DELETE /teams/:id/members/:userId`
- `GET /health`

## Notes

- Auth cookie name defaults to `excplus-auth`.
- Frontend should call `/auth/me` on startup with `credentials: include`.
