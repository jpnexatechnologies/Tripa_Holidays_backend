# TripaHolidays Express API

Express.js API for TripaHolidays, backed by MongoDB. It retains the current API route families while using JWT authentication, bcrypt password hashing, Nodemailer, Swagger UI, and OpenTelemetry request metrics.

## Stack

- Node.js 20+ and Express 4
- MongoDB through the official MongoDB Node.js driver
- JWT authentication and bcrypt password hashing
- Helmet, CORS allow-list, rate limiting, and centralized error handling
- Swagger UI at `/api/docs`; OpenAPI document at `/api/openapi.json`
- OpenTelemetry metrics, Prometheus, and a provisioned Grafana dashboard for local/Docker use
- Vercel serverless function entry point at `api/index.js`

## Local development

1. Install Node.js 20+ and MongoDB, or run the provided MongoDB container with `docker compose up -d mongo`.
2. Copy `.env.example` to `.env`. Set `MONGODB_URI`, `MONGODB_DB_NAME`, a strong `JWT_SECRET` (at least 32 random characters for production), and the exact frontend origins in `CORS_ORIGINS` (for example, `https://tripa-holidays-frontend.vercel.app`, without a path).
3. Install and start the API:

   ```bash
   npm install
   npm run dev
   ```

4. Check `http://localhost:8085/health` and `http://localhost:8085/api/docs`. The health endpoint checks MongoDB connectivity and returns HTTP 503 when the database is unavailable.
5. To create an initial administrator, set `SEED_ADMIN=true` and a strong `ADMIN_PASSWORD`, then run `npm run db:seed-admin`. Disable `SEED_ADMIN` after seeding.

Mongo collections are created automatically. IDs are stored as numeric MongoDB `_id` values to preserve the API's existing numeric `id` fields. The users collection gets a unique email index; supporting indexes are also created at first connection.

## Vercel deployment

1. Import this backend directory as a Vercel project; Vercel detects `api/index.js` as the Node.js function. `vercel.json` rewrites requests to that Express app, preserving the existing API paths.
2. Provision MongoDB Atlas (or another MongoDB service reachable from Vercel). In the database provider's network settings, allow the Vercel deployment's outbound access using the provider's recommended network controls. Do not point Vercel at a MongoDB instance bound only to localhost or a private Docker network.
3. Add these Vercel environment variables for each deployment environment:
   - `MONGODB_URI` — MongoDB connection string, for example `mongodb+srv://...`
   - `MONGODB_DB_NAME` — database name, such as `tripaholidays`
   - `JWT_SECRET` — a unique secret of at least 32 random characters
   - `CORS_ORIGINS` — comma-separated, exact deployed frontend origins
   - `PUBLIC_API_URL` — deployed API origin (optional; `VERCEL_URL` is used if omitted)
   - `JWT_EXPIRES_IN` and SMTP variables as needed
4. Deploy and verify `/health`, `/api/docs`, and an API request that accesses MongoDB.

If `/health` reports HTTP 503 with `database: "DOWN"` or database-backed routes return HTTP 500, verify the Vercel `MONGODB_URI` points to the production database (not `localhost`, `127.0.0.1`, or a Docker service name), the database user has read/write and index-creation privileges, and the database network policy allows the Vercel function to connect. Review the function logs for the underlying MongoDB error; API responses intentionally do not expose database details.

MongoDB connections are initialized lazily and cached between warm function invocations. The API does not open a listening socket in Vercel. The standalone Prometheus exporter is enabled only by the local `src/server.js` process; it is intentionally not started inside Vercel functions.

## Docker Compose

Copy `.env.example` to `.env`, set `JWT_SECRET`, and run:

```bash
docker compose up --build -d
docker compose logs -f api
```

The Compose stack includes MongoDB, the API, Prometheus, and Grafana. Prometheus is available at `http://localhost:9090`; Grafana is at `http://localhost:3000`. The **TripaHolidays API** dashboard is provisioned automatically. Change `GRAFANA_ADMIN_PASSWORD` before using Grafana outside local development. MongoDB and the monitoring UIs bind to localhost by default.

## API endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET/POST | `/api/destinations` | Public read; admin write |
| GET/POST/PUT/DELETE | `/api/packages`, `/api/offers`, `/api/videos` | Public, per existing route behavior |
| POST | `/api/bookings` | Public |
| GET/PUT/DELETE | `/api/bookings` and `/:id` | Admin |
| POST | `/api/contacts` | Public |
| GET/PUT/DELETE | `/api/contacts` and `/:id` | Admin |
| GET | `/api/reviews` | Public |
| POST/PUT/DELETE | `/api/reviews` and `/:id` | Authenticated |
| GET/POST | `/api/users` | Admin |
| PUT/DELETE | `/api/users/:id` | Admin |
| POST | `/api/mail/send`, `/api/mail/send-bulk` | Admin |
| GET | `/health`, `/api/docs`, `/api/openapi.json` | Public |

Protected endpoints require `Authorization: Bearer <JWT>`. Existing response paths and numeric resource IDs are preserved.

Admin user creation accepts `name`, `email`, and a password of at least 8 characters; `phone` is optional and `role` defaults to `USER` (`ADMIN` is also allowed). User updates accept `name`, `email`, `password`, `phone`, and `role`. Passwords are hashed before storage and omitted from API responses. An administrator cannot remove their own admin role.

## Data migration from MySQL

Changing the database driver does not copy existing MySQL records. Back up the old database and migrate its data before switching production traffic. Map each table to a MongoDB collection (`users`, `packages`, `destinations`, `bookings`, `contacts`, `offers`, `reviews`, and `videos`); preserve each legacy integer primary key as the MongoDB document's numeric `_id`, and convert package JSON fields and date values to appropriate BSON values. For an existing users collection, resolve duplicate normalized email addresses before the unique email index is created. Verify record counts and representative API responses before cutover.

## Security and operations

- Never commit `.env` or place database credentials in frontend code.
- Use a restricted MongoDB database user and strong unique secrets.
- Configure exact production CORS origins; do not use `*` with credentialed requests.
- Vercel request metrics are not exported by the local Prometheus listener; use a Vercel-compatible telemetry backend if hosted metrics are required.
- The project currently has no automated test cases; exercise auth, CRUD, and MongoDB connectivity against a disposable database before production cutover.
