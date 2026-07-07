---
name: test-gate
description: Use this skill before considering any code change in this repo (PostPilot) done — after adding or changing logic in lib/ or app/api/ (route handlers, validation, auth, business logic), and always before committing. Runs the Vitest suite and ensures new/changed logic has test coverage.
tools: Bash, Read, Write, Edit, Glob, Grep
---

# Test Gate

This repo uses Vitest for unit and API route tests. Tests live next to the code they cover as `*.test.ts` (e.g. `lib/auth/password.ts` → `lib/auth/password.test.ts`). Before reporting a task as complete or creating a commit, run this gate.

## Steps

1. **Identify what changed** — check which files under `lib/` and `app/api/` were added or modified.
2. **Check for coverage** — for each changed/added source file, confirm a matching `*.test.ts` file exists and actually exercises the new/changed behavior (not just the old one).
   - New pure functions/modules under `lib/`: add a colocated `*.test.ts` covering the happy path, edge cases, and error paths.
   - New or changed API routes under `app/api/`: add/update a colocated `route.test.ts` that mocks external dependencies (Prisma, Redis, etc. via `vi.mock`) and asserts on status codes and response bodies for both success and failure paths.
   - Skip test-writing for trivial glue code (e.g. re-exports, pure type definitions) — use judgment, don't pad coverage.
3. **Run the suite**:
   ```bash
   npm run test
   ```
   Fix any failures in files relevant to the current change.
4. **If unsure whether coverage is adequate**, run with coverage output:
   ```bash
   npm run test:coverage
   ```
   and check the report for the changed files.

## Rules

- Never mock the module under test itself — only mock its external dependencies (database, Redis, network).
- Prefer testing real integration between a route handler and the validation/session/error-mapping logic it calls; only mock things that touch the network, a database, or wall-clock-sensitive external state.
- For auth/session code, always cover: valid input, invalid/malformed input, and expiry/tampering where applicable — these are security-sensitive paths.
- If `npm run test` surfaces pre-existing failures unrelated to your change, mention them to the user instead of silently fixing unrelated code.
- Do not delete or weaken existing tests to make the suite pass — fix the underlying issue.
