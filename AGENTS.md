# AGENTS.md

## Testing

```bash
# Backend tests
cd backend && npm test

# With coverage
cd backend && npm run test:coverage
```

## Code Style

- No comments unless requested
- Prefer editing existing files over creating new ones
- Match existing code patterns and conventions
- Follow security best practices (no secrets in code)

## Priorities

1. Run lint/typecheck after code changes
2. Test after implementing features
3. Commit only when explicitly requested
