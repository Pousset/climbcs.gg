# Contributing

## Workflow

1. Branch from `main` (`feat/…`, `fix/…`, `chore/…`).
2. Keep commits **small and atomic**: one logical change, with its tests, per commit.
3. Run `npm run lint && npm run typecheck && npm test` before pushing.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`.

- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`.
- Scopes: `core`, `api`, `web`, or omitted for repo-wide changes.
- Summary: imperative, lower case, no trailing period, 72 characters max.

Examples:

```
feat(core): add shortest-path yaw interpolation
fix(api): reject demo uploads with a wrong magic header
test(web): cover locked section rendering
```

## Testing policy

- Every exported function has unit tests, including edge cases.
- Pure logic goes in `@cs2/core`; adapters (parser, storage, HTTP) are tested through ports.
- No test may depend on network access or on a real `.dem` file.
