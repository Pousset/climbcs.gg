# CS2 Demo Analyzer

Web platform that turns Counter-Strike 2 demo files into an interactive **2D replay**, a
**scoreboard**, a **rating** and **coaching tips**. Free accounts can analyse one demo per day;
premium unlocks the detailed report.

> Status: **V1 (product demo)** — upload, parsing, replay, quota and a simulated premium plan.
> Billing (Stripe), Steam login and automatic match import are planned for V2.

## Monorepo layout

| Path            | Package    | Role                                                                 |
| --------------- | ---------- | -------------------------------------------------------------------- |
| `packages/core` | `@cs2/core`| Pure, framework-free domain logic (geometry, interpolation, stats…)  |
| `apps/api`      | `@cs2/api` | NestJS REST API (auth, quota, demo upload and parsing)               |
| `apps/web`      | `@cs2/web` | React + Vite front-end (landing page, dashboard, replay viewer)      |

Design rule: **business logic lives in `@cs2/core` as pure functions**, fully unit-tested, and is
consumed by both the API and the web app. Framework code stays thin.

## Requirements

- Node.js >= 20 (see `.nvmrc`)
- npm >= 10

## Getting started

```bash
npm install
npm run build --workspace @cs2/core
npm test            # all workspaces
npm run lint
npm run typecheck
```

## Quality gates

Every change must pass `lint`, `typecheck`, `test` and `build` (enforced by CI).
Commits follow [Conventional Commits](./CONTRIBUTING.md).
