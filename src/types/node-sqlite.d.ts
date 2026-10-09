declare module "node:sqlite" {
  type SqlValue = string | number | bigint | null | Uint8Array;

  export interface StatementSync {
    run(...params: SqlValue[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: SqlValue[]): unknown;
    all(...params: SqlValue[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
