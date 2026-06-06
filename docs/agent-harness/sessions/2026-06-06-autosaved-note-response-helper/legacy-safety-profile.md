# DeepListener Legacy Safety Profile

## Session

| Field | Value |
|---|---|
| Session | 2026-06-06-autosaved-note-response-helper |
| Mode | Contract |
| Domain | Autosaved rich text note response handling |
| Date | 2026-06-06 |

## Protected Data

| ID | Path / Resource | Status Before | Allowed Operations | Stop Condition |
|---|---|---|---|---|
| DATA-001 | `prisma/dev.db` | protected local study data | none | any edit, migration, delete, overwrite, or sync |
| DATA-002 | `public/uploads/` | protected local audio uploads | none | any delete, overwrite, or sync |
| DATA-003 | `.env*` | protected local secrets/config | none | any edit |
| DATA-004 | `npm run sync` | remote backup writer | none | command needed |

## Allowed Surface

| Area | Paths | Notes |
|---|---|---|
| Autosave hook | `src/components/feature/rich-text/useAutosavedRichTextNote.ts` | Forward save errors to consumers without changing save timing or content sync |
| Note editors | `src/components/feature/NoteEditor.tsx`, `src/components/feature/ReviewNoteEditor.tsx` | Delegate save response checks to the shared helper |
| Tests | `src/components/feature/rich-text-consolidation.test.ts` | Boundary coverage only |
| Docs | `docs/agent-harness/sessions/2026-06-06-autosaved-note-response-helper/**`, `CHANGELOG.md` | Record evidence only |

## Verification

| Gate | Scope | Required Result |
|---|---|---|
| targeted tests | rich-text consolidation, contentEditable sync, client-response tests | exits 0 |
| lint/type/test/build | repo gates | exits 0 |
| protected path check | `prisma/dev.db public/uploads .env*` | no output |

## Rollback

| Area | Rollback |
|---|---|
| Code | Revert `src/components/feature/rich-text/useAutosavedRichTextNote.ts`, `src/components/feature/NoteEditor.tsx`, `src/components/feature/ReviewNoteEditor.tsx`, and `src/components/feature/rich-text-consolidation.test.ts` |
| Data | N/A; no schema or data writes allowed |
| Deploy | N/A |
