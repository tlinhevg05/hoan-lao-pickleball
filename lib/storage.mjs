import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { mkdir, readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export const dataDirectory = () => path.resolve(process.env.DATA_DIR || 'data');
export const databasePath = () => path.join(dataDirectory(), 'club.sqlite');
class Statement {
  constructor(database, sql, values = []) { this.database = database; this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.database, this.sql, values); }
  execute() {
    const values = this.values.map(v => typeof v === 'boolean' ? Number(v) : v);
    const results = this.database.connection.prepare(this.sql).all(...values);
    const meta = this.database.connection.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get();
    return { results, meta: { changes: Number(meta.changes), last_row_id: Number(meta.last_row_id) }, success: true };
  }
  async all() { return this.execute(); }
  async run() { return this.execute(); }
  async first() { return this.execute().results[0] || null; }
}
export class ClubDatabase {
  constructor(filename = databasePath()) {
    mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    chmodSync(path.dirname(filename), 0o700);
    this.connection = new DatabaseSync(filename);
    chmodSync(filename, 0o600);
    this.connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  }
  prepare(sql) { return new Statement(this, sql); }
  async batch(statements) {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => {
        if (statement.database !== this) throw new Error('Transaction database mismatch');
        return statement.execute();
      });
      this.connection.exec('COMMIT');
      return results;
    } catch (error) { this.connection.exec('ROLLBACK'); throw error; }
  }
  exec(sql) { this.connection.exec(sql); }
  close() { this.connection.close(); }
}
const databaseKey = Symbol.for('hoan-lao.database');
export function getDatabase() {
  const filename = databasePath();
  const state = globalThis[databaseKey];
  if (!state || state.filename !== filename) {
    state?.db.close();
    globalThis[databaseKey] = { filename, db: new ClubDatabase(filename) };
  }
  return globalThis[databaseKey].db;
}
export class FileRangeError extends Error {
  constructor(size) { super('Requested file range is invalid'); this.size = size; }
}
const mimeTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' };
function filePath(key) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(key)) throw new Error('Invalid file key');
  return path.join(dataDirectory(), 'uploads', key);
}
export function getBucket() {
  return {
    async put(key, value, options = {}) {
      const filename = filePath(key);
      await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
      let bytes;
      if (value instanceof ReadableStream) {
        const chunks = []; let length = 0;
        for await (const chunk of value) {
          length += chunk.byteLength;
          if (length > 32 * 1024 * 1024) throw new Error('Upload exceeds storage limit');
          chunks.push(Buffer.from(chunk));
        }
        bytes = Buffer.concat(chunks);
      } else bytes = Buffer.from(value);
      if (bytes.length > 32 * 1024 * 1024) throw new Error('Upload exceeds storage limit');
      const etag = '"' + createHash('sha256').update(bytes).digest('hex') + '"';
      const tmp = filename + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(tmp, bytes, { mode: 0o600 });
        await rename(tmp, filename);
        await writeFile(filename + '.json', JSON.stringify({ contentType: options.httpMetadata?.contentType || mimeTypes[key.split('.').pop()], etag }), { mode: 0o600 });
      } finally { await unlink(tmp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
      return { key, size: bytes.length, httpEtag: etag };
    },
    async get(key, options = {}) {
      const filename = filePath(key);
      let info;
      try { info = await stat(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
      if (!info.isFile()) return null;
      let metadata;
      try { metadata = JSON.parse(await readFile(filename + '.json', 'utf8')); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        metadata = { contentType: mimeTypes[key.split('.').pop()], etag: '"' + createHash('sha256').update(await readFile(filename)).digest('hex') + '"' };
      }
      const rangeValue = options.range?.get('range');
      const ifRange = options.range?.get('if-range');
      let range;
      if (rangeValue && (!ifRange || ifRange === metadata.etag)) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeValue);
        if (!match || (!match[1] && !match[2])) throw new FileRangeError(info.size);
        const start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
        const end = match[1] && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= info.size || end < start) throw new FileRangeError(info.size);
        range = { offset: start, length: end - start + 1 };
      }
      const stream = createReadStream(filename, range ? { start: range.offset, end: range.offset + range.length - 1 } : {});
      return {
        body: Readable.toWeb(stream), size: info.size, httpEtag: metadata.etag, range,
        writeHttpMetadata(headers) { headers.set('Content-Type', metadata.contentType || 'application/octet-stream'); headers.set('Last-Modified', info.mtime.toUTCString()); },
      };
    },
    async delete(key) {
      const filename = filePath(key);
      for (const p of [filename, filename + '.json']) await unlink(p).catch(error => { if (error.code !== 'ENOENT') throw error; });
    },
  };
}
