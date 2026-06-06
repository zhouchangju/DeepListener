# DeepListener Audit Remediation Plan

## Goal

Fix the code and documentation issues found in the project-wide review without changing existing product behavior, local data, uploaded audio, secrets, or deployment assumptions.

## Safety Boundary

- Do not edit `.env*`.
- Do not delete, overwrite, migrate, or remotely copy `prisma/dev.db`.
- Do not delete, overwrite, or remotely copy `public/uploads/`.
- Do not run the backup sync script without explicit user confirmation.
- Keep changes scoped to setup safety, API contracts, export failure behavior, date semantics, test isolation, CI policy, local hook reliability, and matching docs.

## Task Breakdown

1. Setup safety
   - Add policy coverage for `bin/setup`.
   - Stop setup from creating or editing `.env`.
   - Use the Prisma-resolved SQLite location and apply existing migrations with deploy semantics.

2. Library mutation feedback
   - Add a reusable response checker for client-side library actions.
   - Ensure status/archive mutations fail visibly when the API rejects the request.

3. Export completeness
   - Add export source validation helpers.
   - Make audio and library export endpoints return a client error when selected sources are missing or invalid.

4. Local-day analytics
   - Add local-day helpers.
   - Use the same local-day semantics for study time, dashboard analytics, and review page due windows.

5. API error contracts
   - Add a source policy test for raw internal error messages.
   - Replace raw 500 responses with the shared internal error helper while keeping server-side logging.

6. Test isolation from Prisma native loading
   - Move pure audio export query logic into a helper module.
   - Move pure vault query construction logic into a helper module.
   - Point colocated tests at pure helpers.

7. Quality gate reliability
   - Add hook behavior tests for read-only command allowance and risky command denial.
   - Make hook-internal commands use the current Node executable and local package scripts instead of assuming shell PATH binaries.

8. Package-manager policy
   - Add CI policy coverage for a single npm lockfile.
   - Remove the stale alternate lockfile.

9. Documentation
   - Update project docs/changelog with changed safety and failure semantics.
   - Keep existing user doc changes intact.

## Verification Plan

- Run targeted tests for each touched domain first.
- Run the repo node test runner.
- Run source-scoped ESLint and TypeScript checks.
- Attempt production build and document any local native binary blocker separately from product regressions.
