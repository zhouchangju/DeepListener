# Implementation Rules

Project-specific boundaries and gates for agent edits.

## Edit Boundaries

- Touch only files within the sprint domain defined by the contract or task.
- Avoid drive-by refactors, formatting changes, or cleanup outside your own changes.
- Match existing code style: TypeScript, 2-space indent, semicolons, PascalCase components.
- Use `@/` import alias consistently.

## Verification Gates

Every code change must pass these in order:

1. **Targeted tests**: `node --import tsx --test <paths>` for touched files
2. **Lint**: `npm run lint` (zero warnings)
3. **Build**: `npm run build` (production build must succeed)

For Prisma changes, additionally run `npx prisma migrate dev`.

## Unknowns

- Record unresolved facts in `docs/ai-harness/open-questions.md`.
- Do not invent answers, assume defaults, or fill gaps with plausible-sounding guesses.
- Mark unknowns as `证据不足` in audit contexts.

## Data Safety

- Zero-data-loss by default.
- Protected data: `prisma/dev.db`, `public/uploads/`, `.env*`
- High-risk command: `npm run sync` (overwrites remote state)

## Testing

- Colocated tests: `*.test.ts` and `*.test.tsx` next to source files.
- Every change should pass lint and build.
- Run relevant targeted tests for the touched area.

## Prisma

- After modifying `prisma/schema.prisma`, restart the Next.js dev server.
- Verify with `npx prisma migrate dev`.
- SQLite database resolves to `prisma/dev.db` (relative to schema.prisma).

## Deployment

- `basePath` and `assetPrefix` are not currently set in `next.config.ts`.
- Verify runtime config before any deployment changes.
- Use `scripts/next-build.mjs` wrapper, not raw `next build`.
