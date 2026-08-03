import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('production headers allow only same-origin onboarding frames', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const globalHeaders = config.headers.find(entry => entry.source === '/(.*)')?.headers || [];
  const header = key => globalHeaders.find(item => item.key === key)?.value;

  assert.equal(header('X-Frame-Options'), 'SAMEORIGIN');
  assert.match(header('Content-Security-Policy'), /frame-src 'self'/);
  assert.match(header('Content-Security-Policy'), /frame-ancestors 'self'/);
  assert.doesNotMatch(header('Content-Security-Policy'), /frame-ancestors 'none'/);
});
