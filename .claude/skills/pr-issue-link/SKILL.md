---
name: pr-issue-link
description: Use this skill whenever creating or updating a pull request description in this repo (PostPilot), e.g. via `gh pr create` or `gh pr edit`. Ensures the PR body links the issue it closes.
tools: Bash
---

# PR Issue Link

Every pull request in this repo must reference the issue it resolves so GitHub auto-closes it on merge.

## Rule

The PR body must contain a line in the form:

```
Closes #<issue-number>
```

- Place it in its own line, typically at the end of the Summary section or in a dedicated line near the top.
- Use `Closes` (also acceptable: `Fixes`, `Resolves`) followed by the issue number with a `#` prefix.
- If the issue number isn't known from context (branch name, commit messages, ticket prefix like `AUTH-102`, or explicit user mention), ask the user for the issue number before creating the PR — do not guess or omit it.

## Example

```bash
gh pr create --title "feat: add shared UI primitives" --body "$(cat <<'EOF'
## Summary
- Adds design tokens and 12 shared UI primitives

## Test plan
- [ ] npm run format:check
- [ ] npm run lint
- [ ] npm run typecheck

Closes #102
EOF
)"
```

When editing an existing PR that's missing this line, add it rather than creating a separate comment.
