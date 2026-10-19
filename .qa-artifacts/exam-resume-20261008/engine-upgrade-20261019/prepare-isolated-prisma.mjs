import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const workspace = process.cwd();
const sourceModules = fs.realpathSync('node_modules');
const isolated = path.resolve('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/isolated-prisma');
assert(!fs.existsSync(isolated), 'Preserve existing isolated dependency output');
fs.mkdirSync(path.join(isolated, 'node_modules'), { recursive: true });
const seen = new Set(), packages = [];
function packageRoot(name, from) {
  const req = createRequire(pathToFileURL(path.join(from, 'package.json')));
  let resolved;
  try { resolved = req.resolve(name + '/package.json'); }
  catch { resolved = req.resolve(name); }
  let dir = path.dirname(fs.realpathSync(resolved));
  while (path.dirname(dir) !== dir) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Cannot resolve dependency root: ' + name);
}
function copyPackage(name, from) {
  const source = packageRoot(name, from);
  if (seen.has(source)) return;
  seen.add(source);
  const rel = path.relative(sourceModules, source);
  assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Dependency source must stay inside shared modules');
  const target = path.join(isolated, 'node_modules', rel);
  const info = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  if (!fs.existsSync(target)) fs.cpSync(source, target, { recursive: true, dereference: true, errorOnExist: true, force: false });
  packages.push({ name, version: info.version, relativePath: rel });
  for (const dependency of Object.keys(info.dependencies ?? {})) copyPackage(dependency, source);
  for (const dependency of Object.keys(info.optionalDependencies ?? {})) {
    try { packageRoot(dependency, source); } catch { continue; }
    copyPackage(dependency, source);
  }
}
copyPackage('prisma', workspace);
copyPackage('@prisma/client', workspace);
const version = packages.find((p) => p.name === 'prisma').version;
fs.writeFileSync(path.join(isolated, 'package.json'), JSON.stringify({ private: true, dependencies: { prisma: version, '@prisma/client': version } }, null, 2), { flag: 'wx' });
const originalSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const output = JSON.stringify(path.join(isolated, 'generated-client').replaceAll('\\', '/'));
assert(/generator client \{/.test(originalSchema));
const isolatedSchema = originalSchema.replace(/generator client \{/, `generator client {\n  output = ${output}`);
fs.writeFileSync(path.join(isolated, 'schema.prisma'), isolatedSchema, { flag: 'wx' });
fs.writeFileSync(path.join(isolated, 'dependency-copy-receipt.json'), JSON.stringify({ sourceModules, isolated, packages, sharedWrites: 0, installExecuted: false, copiedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ isolated, packagesCopied: packages.length, sharedWrites: 0, installExecuted: false }));
