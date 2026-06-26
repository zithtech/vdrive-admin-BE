import fs from 'fs';
import path from 'path';
import { VDRIVE_MODULES } from '../../config/permissions';

/**
 * Guardrail: every `requirePermission('module', 'action')` enforced in a route file
 * must exist in the permission catalog (VDRIVE_MODULES — the single source of truth
 * that is seeded into the DB `permissions` table).
 *
 * This catches the exact class of bug that cost real debugging time, e.g. a route
 * checking `requirePermission('support_ticket', ...)` while the catalog/DB module is
 * `support_tickets` — a silent 403 for every admin who actually holds the permission.
 */

// Build catalog: module -> Set of allowed action strings.
const catalog: Record<string, Set<string>> = {};
for (const [moduleKey, moduleVal] of Object.entries(VDRIVE_MODULES) as [string, any][]) {
  catalog[moduleKey] = new Set(moduleVal.permissions.map((p: string) => p.split('.')[1]));
}

// Recursively collect every *.routes.ts under src/modules.
function collectRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry.name.endsWith('.routes.ts')) out.push(full);
  }
  return out;
}

const modulesDir = path.resolve(__dirname, '../../modules');
const routeFiles = collectRouteFiles(modulesDir);

// `\s` matches newlines, so multi-line calls are covered too.
const usagePattern =
  /requirePermission\(\s*['"]([a-zA-Z_]+)['"]\s*,\s*['"]([a-zA-Z_]+)['"]\s*\)/g;

interface Usage {
  module: string;
  action: string;
  file: string;
}

const usages: Usage[] = [];
for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  usagePattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = usagePattern.exec(content)) !== null) {
    usages.push({ module: match[1], action: match[2], file: path.relative(modulesDir, file) });
  }
}

describe('RBAC route ↔ catalog consistency', () => {
  it('finds requirePermission usages to validate', () => {
    expect(usages.length).toBeGreaterThan(0);
  });

  it('every requirePermission(module, action) in routes exists in the catalog', () => {
    const offenders = usages.filter(
      (u) => !catalog[u.module] || !catalog[u.module].has(u.action),
    );
    const report = offenders.map((o) => `  - ${o.module}.${o.action}  (${o.file})`).join('\n');
    // Compared against '' so a failure prints exactly which strings are missing.
    expect(offenders.length ? `Unknown permissions used in routes:\n${report}` : '').toBe('');
  });
});
