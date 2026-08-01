/**
 * Local type declaration for Node's experimental `node:sqlite` module.
 *
 * `@types/node` (as of the version in this project) does not yet ship types
 * for `node:sqlite` (`DatabaseSync`), which is stable enough to use on Node 22+
 * but still flagged experimental by Node. The migration runner
 * (`src/lib/migration-runner.ts`) imports it dynamically; this ambient
 * declaration lets TypeScript resolve the import without weakening strictness
 * elsewhere. Only the surface the runner uses is declared.
 */
declare module "node:sqlite" {
  export interface StatementResult {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  }
  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementResult;
    close(): void;
  }
}
