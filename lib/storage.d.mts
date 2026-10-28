import type { DatabaseSync } from 'node:sqlite';
export interface QueryResult<T = Record<string, any>> { results: T[]; meta: { changes: number; last_row_id: number }; success: boolean; }
export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T = Record<string, any>>(): Promise<QueryResult<T>>;
  run<T = Record<string, any>>(): Promise<QueryResult<T>>;
  first<T = Record<string, any>>(): Promise<T | null>;
}
export class ClubDatabase {
  constructor(filename?: string);
  connection: DatabaseSync;
  prepare(sql: string): Statement;
  batch<T = Record<string, any>>(statements: Statement[]): Promise<QueryResult<T>[]>;
  exec(sql: string): void;
  close(): void;
}
export function dataDirectory(): string;
export function databasePath(): string;
export function getDatabase(): ClubDatabase;
export class FileRangeError extends Error { size: number; }
export function getBucket(): {
  put(key: string, value: Uint8Array | ReadableStream<Uint8Array>, options?: { httpMetadata?: { contentType?: string } }): Promise<{ key: string; size: number; httpEtag: string }>;
  get(key: string, options?: { range?: Headers }): Promise<null | { body: ReadableStream<Uint8Array>; size: number; httpEtag: string; range?: { offset: number; length: number }; writeHttpMetadata(headers: Headers): void }>;
  delete(key: string): Promise<void>;
};
