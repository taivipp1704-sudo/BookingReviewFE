import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';

test('authentication artwork stays optimized for the first page load', async () => {
  const artwork = new URL('../../public/assets/amy-login-optimized.jpg', import.meta.url);
  const component = await readFile(
    new URL('../views/components/AuthShell.jsx', import.meta.url),
    'utf8'
  );

  assert.ok((await stat(artwork)).size < 400_000);
  assert.match(component, /amy-login-optimized\.jpg/);
  assert.doesNotMatch(component, /amy-login-reference@2x\.png/);
});

test('onboarding pages reuse the shared mascot instead of embedding it', async () => {
  const onboardingDirectory = new URL('../../public/onboarding/', import.meta.url);
  const pages = (await readdir(onboardingDirectory))
    .filter(name => /^AMY_Onboarding_Trang_\d{2}\.html$/.test(name));

  assert.equal(pages.length, 8);
  for (const page of pages) {
    const contents = await readFile(new URL(page, onboardingDirectory), 'utf8');
    assert.doesNotMatch(contents, /data:image\//);
    assert.match(contents, /\/assets\/amy-onboarding-mascot\.png/);
    assert.ok(Buffer.byteLength(contents) < 50_000);
  }
});
