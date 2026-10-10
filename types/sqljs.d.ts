declare module 'sql.js' {
  export interface SqlJsOptions {
    wasmBinary?: ArrayBuffer;
    locateFile?: (file: string) => string;
  }
  export interface Database {
    constructor(data?: ArrayLike<number> | Buffer | Uint8Array);
    run(sql: string, params?: any[]): void;
    prepare(sql: string): Statement;
    exec(sql: string, params?: any[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }
  export interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, any>;
    getColumnNames(): string[];
    free(): void;
  }
  export interface QueryExecResult {
    columns: string[];
    values: any[][];
  }
  export default function initSqlJs(options?: SqlJsOptions): Promise<{ Database: new () => Database }>;
}
