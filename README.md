# Westbridge API

Keeps an off-Roblox copy of player data, company data and game logs in Postgres. DataStore stays the live source.

## Setup
1. Deploy this folder as a Vercel project.
2. Vercel Marketplace > Storage > install Neon (Free) > connect it to this project. That adds `DATABASE_URL`.
3. Add an environment variable `WESTBRIDGE_API_KEY`: a random string of at least 32 characters.
4. Open Storage > the database > Database > Query, paste in `schema.sql`, and run it.
5. Redeploy, so the new variables are picked up.

Optional: `LOG_RETENTION_DAYS` (default 30).

## Endpoints
All need the header `x-api-key`.

- `GET /api/health`
- `POST /api/sync` with `{ players: [{userId, data, savedAt}], companies: [{key, data, savedAt}], logs: [{category, actorId?, targetId?, data, time}] }`. Times are Unix seconds. Up to 200 of each per request.
- `GET /api/player/{userId}`
