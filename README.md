# csClimb.gg

Web platform that turns Counter-Strike 2 demo files into an interactive **2D replay**, a
**scoreboard**, a **rating** and **coaching tips**. Free accounts analyse one demo per day;
Premium unlocks the detailed report.

> Status: **V1 (product demo)**: upload, parsing, replay, daily quota and a simulated Premium plan.
> Billing (Stripe), Steam login and automatic match import are planned for V2.
> See [docs/architecture.md](docs/architecture.md) for design decisions and known limitations.

## Monorepo layout

| Path            | Package     | Role                                                               |
| --------------- | ----------- | ------------------------------------------------------------------ |
| `packages/core` | `@cs2/core` | Pure, framework-free domain logic (geometry, stats, rating, tips…) |
| `apps/api`      | `@cs2/api`  | NestJS REST API (auth, quota, demo upload and parsing)             |
| `apps/web`      | `@cs2/web`  | React + Vite front-end (landing page, dashboard, replay viewer)    |

Design rule: **business logic lives in `@cs2/core` as pure functions**, fully unit-tested, and is
consumed by both the API and the web app. Framework code stays thin.

## Requirements

- Node.js >= 20 (see `.nvmrc`), npm >= 10
- Docker (optional, only for a local PostgreSQL)

## Getting started

```bash
npm install
cp apps/api/.env.example apps/api/.env   # adjust if needed
npm run dev:api                          # API on http://localhost:3000
npm run dev:web                          # web on http://localhost:5173 (proxies /api)
```

By default the API uses SQLite (`apps/api/storage/dev.sqlite`). To use PostgreSQL:
`docker compose up -d`, then set `DB_TYPE=postgres` and `DATABASE_URL` in `apps/api/.env`.

With `ENABLE_DEV_PLAN_SWITCH=true`, the "Passer en Premium (démo)" button simulates a subscription.

## Scripts

| Command                | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm test`             | Unit and e2e tests of every workspace    |
| `npm run lint`         | ESLint                                   |
| `npm run format:check` | Prettier check (`npm run format` to fix) |
| `npm run typecheck`    | TypeScript in every workspace            |
| `npm run build`        | Build core, API and web                  |

## API

All routes are prefixed with `/api`. Routes marked 🔒 need `Authorization: Bearer <token>`.

| Method and path                     | Description                                                      |
| ----------------------------------- | ---------------------------------------------------------------- |
| `GET /health`                       | Liveness probe                                                   |
| `POST /auth/register`               | Create an account (username + password), returns a JWT           |
| `POST /auth/login`                  | Log in, returns a JWT                                            |
| 🔒 `GET /users/me`                  | Current user                                                     |
| 🔒 `PUT /users/me/plan`             | Simulated plan switch (404 unless `ENABLE_DEV_PLAN_SWITCH=true`) |
| 🔒 `POST /demos`                    | Upload a `.dem` (multipart field `file`), answers 202            |
| 🔒 `GET /demos`, `GET /demos/quota` | List demos, daily quota status                                   |
| 🔒 `GET /demos/:id`                 | Demo status (`processing`, `ready`, `failed`)                    |
| 🔒 `GET /demos/:id/replay`          | Normalised replay (frames, kills, damage, bomb)                  |
| 🔒 `GET /demos/:id/scoreboard`      | Basic statistics of every player                                 |
| 🔒 `GET /demos/:id/report?player=`  | Report gated by plan (locked values are `null`)                  |
| 🔒 `DELETE /demos/:id`              | Delete a demo and its replay                                     |

Error bodies carry a machine-readable `code` (`DAILY_QUOTA_EXCEEDED`, `INVALID_HEADER`, …).

## Testing

- `@cs2/core`: unit tests of every exported function (Vitest).
- `@cs2/api`: unit tests of services and pure helpers plus HTTP e2e tests through the real Nest
  application with an in-memory SQLite database (Jest, Supertest). No test needs the network or a
  real demo file.
- `@cs2/web`: Vitest and Testing Library for components, hooks, the API client and the canvas
  renderer (recorded drawing calls).

## Quality gates

Every change must pass `lint`, `format:check`, `typecheck`, `test` and `build` (enforced by CI).
Commits follow [Conventional Commits](./CONTRIBUTING.md).
