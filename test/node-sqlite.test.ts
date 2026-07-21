import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DataFactory } from 'rdf-data-factory';
import { D1QuadSource, insertQuads } from '../src/d1-source.js';
import { NodeSqliteDatabase } from '../src/node-sqlite.js';
import { initializeStore } from '../src/schema.js';

const factory = new DataFactory();
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function temporaryDatabasePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'diamond-node-sqlite-'));
  temporaryDirectories.push(directory);
  return join(directory, 'diamond.sqlite');
}

describe('NodeSqliteDatabase', () => {
  it('validates construction, SQL, statements, and bound values', async () => {
    expect(() => new NodeSqliteDatabase('')).toThrow(/path/u);
    expect(
      () => new NodeSqliteDatabase(':memory:', { busyTimeoutMs: -1 }),
    ).toThrow(/busyTimeoutMs/u);
    expect(
      () => new NodeSqliteDatabase(':memory:', { busyTimeoutMs: 1.5 }),
    ).toThrow(/busyTimeoutMs/u);

    const db = new NodeSqliteDatabase(':memory:');
    try {
      expect(() => db.prepare('  ')).toThrow(/must not be empty/u);
      await expect(
        db.batch([
          {
            bind() {
              return this;
            },
            async run() {
              return { results: [] };
            },
            async all() {
              return { results: [] };
            },
          },
        ]),
      ).rejects.toThrow(/incompatible statement/u);
      await db
        .prepare(
          'CREATE TABLE bindings (flag INTEGER, bytes BLOB, integer_value INTEGER)',
        )
        .run();
      await db
        .prepare('INSERT INTO bindings VALUES (?, ?, ?)')
        .bind(true, new ArrayBuffer(2), 7n)
        .run();
      const first = await db
        .prepare('SELECT flag, length(bytes) AS length FROM bindings')
        .first<{ flag: number; length: number }>();
      expect(first).toEqual({ flag: 1, length: 2 });
      await expect(
        db.prepare('SELECT 1').first<{ value: number }>(),
      ).resolves.not.toBeNull();
      expect(() => db.prepare('SELECT ?').bind({ bad: true })).toThrow(
        /unsupported SQLite binding/iu,
      );
    } finally {
      await db.close();
      await db.close();
    }
  });

  it('initializes, writes, and reads an in-memory store', async () => {
    const db = new NodeSqliteDatabase(':memory:');
    try {
      await initializeStore(db);
      const quad = factory.quad(
        factory.namedNode('https://example.test/memory'),
        factory.namedNode('https://example.test/value'),
        factory.literal('ok'),
      );
      await expect(insertQuads(db, [quad])).resolves.toBe(1);
      await expect(new D1QuadSource(db).countQuads(quad.subject)).resolves.toBe(
        1,
      );
    } finally {
      await db.close();
    }
  });

  it('persists across a file close and reopen', async () => {
    const path = await temporaryDatabasePath();
    const first = new NodeSqliteDatabase(path);
    await initializeStore(first);
    const quad = factory.quad(
      factory.namedNode('https://example.test/reopen'),
      factory.namedNode('https://example.test/value'),
      factory.literal('durable'),
    );
    await insertQuads(first, [quad]);
    await first.close();

    const reopened = new NodeSqliteDatabase(path);
    try {
      await initializeStore(reopened);
      await expect(
        new D1QuadSource(reopened).countQuads(quad.subject),
      ).resolves.toBe(1);
    } finally {
      await reopened.close();
    }
  });

  it('rolls back the entire ordered batch after a middle failure', async () => {
    const db = new NodeSqliteDatabase(':memory:');
    try {
      await expect(
        db.batch([
          db.prepare('CREATE TABLE rollback_probe (id INTEGER PRIMARY KEY)'),
          db.prepare('INSERT INTO rollback_probe VALUES (1)'),
          db.prepare('INSERT INTO missing_table VALUES (2)'),
        ]),
      ).rejects.toThrow(/missing_table/u);
      const tables = await db
        .prepare("SELECT name FROM sqlite_schema WHERE name = 'rollback_probe'")
        .all();
      expect(tables.results).toEqual([]);
    } finally {
      await db.close();
    }
  });

  it('serializes concurrent batches through one connection', async () => {
    const db = new NodeSqliteDatabase(':memory:');
    try {
      await db.prepare('CREATE TABLE writes (value INTEGER PRIMARY KEY)').run();
      const writes = Array.from({ length: 50 }, (_, value) =>
        db.batch([
          db.prepare('INSERT INTO writes (value) VALUES (?)').bind(value),
          db.prepare('SELECT COUNT(*) AS count FROM writes'),
        ]),
      );
      await expect(Promise.all(writes)).resolves.toHaveLength(50);
      const result = await db
        .prepare('SELECT COUNT(*) AS count FROM writes')
        .all<{ count: number }>();
      expect(result.results[0]?.count).toBe(50);
    } finally {
      await db.close();
    }
  });

  it('rejects cross-connection statements and use after close', async () => {
    const first = new NodeSqliteDatabase(':memory:');
    const second = new NodeSqliteDatabase(':memory:');
    const statement = first.prepare('SELECT 1');
    await expect(second.batch([statement])).rejects.toThrow(
      /another connection/u,
    );
    await first.close();
    await expect(statement.all()).rejects.toThrow(/closed/u);
    expect(() => first.prepare('SELECT 1')).toThrow(/closed/u);
    await second.close();
  });

  it('supports explicit async disposal', async () => {
    const db = new NodeSqliteDatabase(':memory:');
    await db[Symbol.asyncDispose]();
    expect(() => db.prepare('SELECT 1')).toThrow(/closed/u);
  });

  it('honors second-process contention and the bounded busy timeout', async () => {
    const path = await temporaryDatabasePath();
    const contender = new NodeSqliteDatabase(path, { busyTimeoutMs: 25 });
    await contender
      .prepare('CREATE TABLE writes (value INTEGER PRIMARY KEY)')
      .run();
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import { DatabaseSync } from 'node:sqlite';
         const db = new DatabaseSync(process.argv[1]);
         db.exec('PRAGMA busy_timeout = 1000');
         db.exec('BEGIN IMMEDIATE');
         db.exec('INSERT INTO writes VALUES (1)');
         process.stdout.write('ready\\n');
         process.stdin.once('data', () => {
           db.exec('ROLLBACK');
           db.close();
           process.exit(0);
         });`,
        path,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    try {
      const [ready] = await once(child.stdout, 'data');
      expect(String(ready)).toContain('ready');
      await expect(
        contender.prepare('INSERT INTO writes VALUES (2)').run(),
      ).rejects.toThrow(/locked|busy/u);
    } finally {
      child.stdin.end('release\n');
      const [exitCode] = await once(child, 'exit');
      expect(exitCode).toBe(0);
    }
    try {
      await expect(
        contender.prepare('INSERT INTO writes VALUES (2)').run(),
      ).resolves.toMatchObject({ meta: { changes: 1 } });
    } finally {
      await contender.close();
    }
  });
});
