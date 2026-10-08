import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for (const [file, root] of [['dist/site.js', '/'], ['docs/site.js', '/relay-fellowship/']]) {
  let banner;
  const header = { after(element) { banner = element; } };
  const storage = new Map([['relayWelcomeAfterLogin', JSON.stringify({ program: 'uwc' })]]);
  const location = { pathname: root, href: 'https://example.test' + root + '?welcome=1&program=uwc' };
  const history = { replaceState(_state, _title, url) { assert.equal(url.searchParams.has('welcome'), false); } };
  const document = {
    querySelector(selector) { return selector === '.hero-surface > header' ? header : null; },
    createElement(tag) {
      assert.equal(tag, 'div');
      return { setAttribute() {}, querySelector() { return { addEventListener() {} }; } };
    }
  };
  const sessionStorage = {
    getItem(key) { return storage.get(key); },
    removeItem(key) { storage.delete(key); }
  };
  vm.runInNewContext(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { location, history, document, sessionStorage, Date, URL });
  assert.ok(banner);
  assert.match(banner.innerHTML, /FLEX Global 2027–28/);
  assert.ok(banner.innerHTML.includes('href="' + root + 'dashboard/?program=uwc"'));
  assert.ok(banner.innerHTML.includes('href="' + root + 'opportunities/"'));
  assert.equal(storage.has('relayWelcomeAfterLogin'), false);
}
console.log('Home invitation, program context, and one-time state: OK');
