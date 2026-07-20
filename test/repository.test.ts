import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function sqlStatements(file: string): string[] {
  return readFileSync(file, 'utf8')
    .replace(/^--> statement-breakpoint\s*$/gmu, '')
    .split(';')
    .map((statement) => statement.replace(/\s+/gu, ' ').trim())
    .filter(Boolean);
}

describe('published integration assets', () => {
  it('keeps the Codex Sites Drizzle migration aligned with the package migration', () => {
    expect(
      sqlStatements('examples/codex-site/drizzle/0000_rdf_quads.sql'),
    ).toEqual(sqlStatements('migrations/0001_rdf_quads.sql'));
  });

  it('binds the example route and hosting declaration to the same D1 name', () => {
    const hosting = JSON.parse(
      readFileSync('examples/codex-site/.openai/hosting.json', 'utf8'),
    );
    const route = readFileSync(
      'examples/codex-site/app/api/sparql/route.ts',
      'utf8',
    );
    expect(hosting.d1).toBe('DB');
    expect(route).toContain('db: siteEnv.DB');
    expect(route).toContain('readOnly: true');
  });

  it('keeps the optional writable route separate and fail-closed', () => {
    const route = readFileSync(
      'examples/codex-site/app/api/sparql/admin/route.ts',
      'utf8',
    );
    expect(route).toContain('db: siteEnv.DB');
    expect(route).toContain('SPARQL_ADMIN_TOKEN');
    expect(route).toContain('readOnly: false');
    expect(route).toContain('status: 503');
  });

  it('keeps managed-schema inspection temporary and fail-closed', () => {
    const route = readFileSync(
      'examples/codex-site/app/api/sparql/schema/route.ts',
      'utf8',
    );
    expect(route).toContain('inspectStoreSchema');
    expect(route).toContain('SPARQL_ADMIN_TOKEN');
    expect(route).toContain('status: 503');
    expect(route).toContain("'cache-control': 'no-store'");
  });

  it('includes the complete Sites example in the packed package', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.files).toContain('examples');
  });
});
