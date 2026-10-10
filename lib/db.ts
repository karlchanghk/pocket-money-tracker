// Database abstraction layer
// - Local dev (no DATABASE_URL): sql.js (persisted file)
// - Turso (libsql://...): @libsql/client
// - Supabase/PostgreSQL (postgres://...): pg driver

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface Db {
  dialect: 'sqlite' | 'postgres' | 'turso';
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string, params?: any[]): Promise<number>; // returns last inserted id or affected rows
  close?(): Promise<void>;
}

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    _db = await initSqlite();
  } else if (dbUrl.startsWith('libsql://')) {
    _db = await initTurso(dbUrl);
  } else {
    _db = await initPg(dbUrl);
  }
  return _db;
}

// ==================== PostgreSQL (Supabase) ====================

async function initPg(connectionString: string): Promise<Db> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString });

  // Test connection & ensure schema
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '💰',
        UNIQUE(user_id, name)
      );

      CREATE TABLE IF NOT EXISTS records (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        content TEXT NOT NULL,
        category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }

  return {
    dialect: 'postgres' as const,
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      // Convert SQLite-style ? placeholders to PG $1, $2, ...
      const pgSql = convertPlaceholders(sql);
      const result = await pool.query(pgSql, params || []);
      return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
    },
    async exec(sql: string, params?: any[]): Promise<number> {
      const pgSql = convertPlaceholders(sql);
      // Try to use RETURNING id for INSERT; for other statements use rowCount
      if (/^\s*INSERT\s/i.test(sql) && !/RETURNING/i.test(sql)) {
        const result = await pool.query(pgSql + ' RETURNING id', params || []);
        return result.rows[0]?.id || 0;
      }
      const result = await pool.query(pgSql, params || []);
      return result.rowCount || 0;
    },
  };
}

// ==================== Turso (libsql) ====================

async function initTurso(url: string): Promise<Db> {
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url });

  // Create tables (Turso uses SQLite syntax)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '💰',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      content TEXT NOT NULL,
      category_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  return {
    dialect: 'turso' as const,
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const result = await client.execute(sql, params || []);
      const rows = result.rows as T[];
      return { rows, rowCount: rows.length };
    },
    async exec(sql: string, params?: any[]): Promise<number> {
      const result = await client.execute(sql, params || []);
      if (result.lastInsertRowid) return Number(result.lastInsertRowid);
      return result.rowsAffected || 0;
    },
  };
}

// ==================== SQLite (sql.js) ====================

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let _sqlDb: SqlJsDatabase | null = null;
let _sqlInitialized = false;
const DB_PATH = path.join(process.cwd(), 'data', 'pocket-money.db');

async function initSqlite(): Promise<Db> {
  if (_sqlInitialized && _sqlDb) {
    return makeSqlDb(_sqlDb);
  }

  const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary: wasmBinary.buffer as ArrayBuffer });

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    _sqlDb = new SQL.Database(data);
  } else {
    _sqlDb = new SQL.Database();
  }

  _sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '💰',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      content TEXT NOT NULL,
      category_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  _sqlInitialized = true;
  return makeSqlDb(_sqlDb);
}

function makeSqlDb(db: SqlJsDatabase): Db {
  const persist = () => {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  return {
    dialect: 'sqlite' as const,
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const stmt = db.prepare(sql);
      if (params && params.length > 0) stmt.bind(params);
      const rows: any[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { rows: rows as T[], rowCount: rows.length };
    },
    async exec(sql: string, params?: any[]): Promise<number> {
      // For INSERT with specific handling
      if (/^\s*INSERT\s/i.test(sql)) {
        db.run(sql, params || []);
        persist();
        const r = db.exec('SELECT last_insert_rowid() as id');
        return r[0]?.values[0]?.[0] || 0;
      }
      const changes = db.exec(sql, params || []);
      persist();
      // sql.js run() doesn't return rowcount directly; approximate
      return changes ? changes.length : 0;
    },
  };
}

// ==================== Helpers ====================

// Convert SQLite-style ? placeholders to PG $1, $2, ...
function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
