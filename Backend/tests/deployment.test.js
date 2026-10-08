const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
for (const file of ['za.html','login.html','researcher.html']) {
  test(`${file} uses same-origin API`, () => {
    const html = fs.readFileSync(path.join(root,'frontend',file),'utf8');
    assert.match(html, /window\.location\.origin/);
    assert.doesNotMatch(html, /http:\/\/localhost:5000\/api/);
  });
}
test('root serves the frontend', async () => {
  process.env.JWT_SECRET ||= 'deployment-test-secret-with-enough-length';
  // The API test suite mocks the DB; here we only request the static homepage.
  const app = require('../index');
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Celestial Voyager/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
