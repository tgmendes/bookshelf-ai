import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('Drizzle legacy loader uses patched esbuild and still transforms TypeScript', async () => {
  const require = createRequire(import.meta.url);
  const fromDrizzle = createRequire(require.resolve('drizzle-kit'));
  const fromLoader = createRequire(fromDrizzle.resolve('@esbuild-kit/esm-loader'));
  const fromCore = createRequire(fromLoader.resolve('@esbuild-kit/core-utils'));
  assert.equal(fromCore('esbuild').version, '0.25.12');

  const core = fromLoader('@esbuild-kit/core-utils');
  const source = 'export const answer: number = 42;';
  const transformed = core.transformSync(source, '/virtual/drizzle-override-test.ts');
  const module = { exports: {} as { answer?: number } };
  runInNewContext(transformed.code, { module, exports: module.exports });
  assert.equal(module.exports.answer, 42);

  const esm = await core.transform(source, '/virtual/drizzle-override-test.mts');
  assert.match(esm.code, /export/);
  assert.ok(esm.map);
});
