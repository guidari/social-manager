---
name: quality-gate
description: Use this skill before considering any code change in this repo (PostPilot) done — after editing/writing TS, TSX, or CSS files, and always before committing. Runs format, lint, and typecheck, and fixes any Prettier violations automatically.
tools: Bash
---

# Quality Gate

This repo enforces Prettier formatting, ESLint, and TypeScript strictness. Before reporting a task as complete or creating a commit, run this gate.

## Steps

1. **Format check** — detect Prettier violations without touching files:
   ```bash
   npm run format:check
   ```
2. **If step 1 reports violations**, fix them automatically (the `format` script already runs `prettier --write .`, so do not append another `--write` flag):
   ```bash
   npm run format
   ```
   Then re-run `npm run format:check` to confirm it's clean.
3. **Lint**:
   ```bash
   npm run lint
   ```
   Fix any reported issues in the edited files (do not blanket-disable rules).
4. **Typecheck**:
   ```bash
   npm run typecheck
   ```
   Fix any type errors in the edited files.

## Rules

- Never skip step 1/2 — do not hand-format code to match Prettier's style; let `npm run format` do it, since manual formatting drifts from the `prettier-plugin-tailwindcss` class-sorting output.
- Only fix issues in files relevant to the current change. Don't run a repo-wide reformat of unrelated files as a drive-by.
- If `npm run lint` or `npm run typecheck` surface pre-existing failures unrelated to your change, mention them to the user instead of silently fixing unrelated code.
