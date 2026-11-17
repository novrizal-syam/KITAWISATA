// Supplier settings end to end, against e2e/mock-supplier.js. Usage: node e2e/suppliers.e2e.js server.log
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const LOG = process.argv[2], BASE = 'http://localhost:3000', SUP = 'http://localhost:4020'; const errors = [];
const check = (l, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) process.exitCode = 1; };
const sql = (q) => execSync(`docker compose exec -T db psql -U kitawisata -tAc "${q.replace(/"/g, '\\"')}"`, { cwd: process.cwd() }).toString().trim();
const d = (n) => { const x = new Date(Date.now() + 7 * 3600e3); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const mode = (m) => fetch(`${SUP}/control/mode?m=${m}`);
async function login(b, phone, cb) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage(); p.on('pageerror', e => errors.push(phone + ': ' + e.message));
  await p.goto(BASE + '/login?callbackUrl=' + encodeURIComponent(cb)); await p.fill('input[name=phone]', phone); await p.click('form button.btn-red'); await p.waitForSelector('input[name=code]');
  const code = [...fs.readFileSync(LOG, 'utf8').matchAll(new RegExp('\\+62' + phone.slice(1) + ' -> (\\d{6})', 'g'))].pop()[1];
  await p.fill('input[name=code]', code); await p.click('form button.btn-red'); await p.waitForURL(u => !u.pathname.startsWith('/login')); return p;
}
(async () => {
  await mode('ok');
  const b = await chromium.launch();
  const ops = await login(b, '081100000009', '/portal/suppliers'); await ops.locator('h1:has-text("Supplier settings")').waitFor();
  check('starts with no suppliers, everything on the sample', (await ops.locator('main').innerText()).includes('No suppliers connected yet') && (await ops.inputValue('select[name=FLIGHT]')) === 'sample');
  const add = ops.locator('form[aria-label="Connect a supplier"]');
  await add.locator('input[name=name]').fill('Contoh Air'); await add.locator('input[name=baseUrl]').fill('http://supplier.example.com/kw/v1');
  await add.locator('input[name=kinds][value=FLIGHT]').check(); await add.locator('button').click(); await add.locator('[role=alert]').first().waitFor();
  check('plain http outside localhost refused', (await add.innerText()).includes('Use https://'));
  await add.locator('input[name=baseUrl]').fill(SUP + '/kw/v1'); await add.locator('input[name=apiKey]').fill('sup-key-123'); await add.locator('input[name=canIssue]').check();
  await add.locator('button').click(); await ops.locator('article:has-text("Contoh Air")').waitFor();
  const card = ops.locator('article', { hasText: 'Contoh Air' });
  check('connected; key shown only as a hint', (await card.locator('input[name=apiKey]').getAttribute('placeholder')).includes('••••-123') && !(await ops.content()).includes('sup-key-123'));
  check('key stored encrypted', sql(`select "apiKeyEnc" from "SupplierConnection"`).startsWith('v1:'));
  await card.locator('button:has-text("Test connection")').click(); await card.locator('[role=status]').first().waitFor();
  check('test connection: ' + await card.locator('[role=status]').first().innerText(), (await card.locator('[role=status]').first().innerText()).includes('3 valid offers'));
  await ops.selectOption('select[name=FLIGHT]', { label: 'Contoh Air' }); await ops.click('button:has-text("Save choices")'); await ops.locator('form:has(select[name=FLIGHT]) [role=status]').waitFor();
  check('trains and stays offer only the sample (Contoh Air serves flights)', (await ops.locator('select[name=TRAIN] option').count()) === 1);
  // Travellers see the supplier's flights
  const p = await login(b, '081299990004', '/travel/flights');
  await p.goto(`${BASE}/travel/flights?from=CGK&to=DPS&date=${d(20)}&pax=2`); await p.locator('main ul li').first().waitFor();
  let main = await p.locator('main').innerText();
  check('supplier flights, no sample notice', main.includes('Contoh Air') && !main.includes('[Airline A]') && !main.includes('no airline, rail or hotel supplier is connected'));
  check('cheapest first: Rp 2.780.000 for 2', (await p.locator('main ul li').first().innerText()).includes('Rp 2.780.000'));
  await p.goto(`${BASE}/travel/trains?from=GMR&to=YK&date=${d(20)}&pax=1`); check('trains still sample, with the notice', (await p.locator('main').innerText()).includes('no airline, rail or hotel supplier is connected'));
  // Book and issue via the supplier
  await p.goto(`${BASE}/travel/flights?from=CGK&to=DPS&date=${d(20)}&pax=2`); await p.locator('main ul li').first().locator('a:has-text("Select")').click(); await p.locator('h1:has-text("Your booking")').waitFor();
  await p.fill('input[name=contactName]', 'Lina Wijaya'); await p.locator('input[name=travellerName]').nth(0).fill('Lina Wijaya'); await p.locator('input[name=travellerName]').nth(1).fill('Arief Wijaya');
  await p.click('button:has-text("Book")'); await p.waitForURL(/created=1/); const code = p.url().match(/KT-[A-Z0-9]{6}/)[0];
  const connId = sql(`select id from "SupplierConnection"`);
  check('booked at the supplier\'s price, supplier recorded', sql(`select total || ' ' || "supplierId" from "TicketBooking" where code='${code}'`) === `2780000 ${connId}`);
  await ops.goto(BASE + '/portal/ticket-bookings'); ops.once('dialog', x => x.accept());
  await ops.locator('tr', { hasText: code }).locator('button:has-text("received")').click(); await ops.waitForURL(/done=pay/);
  await ops.locator('tr', { hasText: code }).locator('button:has-text("Issue via Contoh Air")').click(); await ops.waitForURL(/done=supplier/);
  const ref = (await (await fetch(SUP + '/control/issued')).json()).find((x) => x.code === code)?.ref;
  check('issued via supplier with its reference ' + ref, Boolean(ref) && sql(`select status || ' ' || "issuedRef" from "TicketBooking" where code='${code}'`) === `ISSUED ${ref}`);
  await p.goto(BASE + '/my-trips/tickets/' + code); check('traveller sees the supplier reference', (await p.locator('main').innerText()).includes(ref));
  // Outages and bad data
  await mode('down'); await p.goto(`${BASE}/travel/flights?from=CGK&to=DPS&date=${d(21)}&pax=1`);
  check('supplier down: friendly message, no crash', (await p.locator('main [role=alert]').innerText()).includes("can't reach our supplier"));
  await ops.goto(BASE + '/portal/suppliers'); await ops.locator('article button:has-text("Test connection")').click(); await ops.locator('article [role=status]').first().waitFor();
  check('test connection reports the outage', (await ops.locator('article [role=status]').first().innerText()).includes("didn't answer correctly"));
  await mode('bad'); await p.reload();
  check('malformed offers rejected, not shown', (await p.locator('main [role=alert]').innerText()).includes("can't reach our supplier") && !(await p.locator('main').innerText()).includes('cheap'));
  await mode('ok');
  // Can't remove a supplier that is in use
  ops.once('dialog', x => x.accept()); await ops.locator('article button:has-text("Remove")').click(); await ops.locator('article [role=alert]').waitFor();
  check('in-use supplier cannot be removed', (await ops.locator('article [role=alert]').innerText()).includes('Change the choice first'));
  await ops.selectOption('select[name=FLIGHT]', 'sample'); await ops.click('button:has-text("Save choices")'); await ops.locator('form:has(select[name=FLIGHT]) [role=status]').waitFor();
  ops.once('dialog', x => x.accept()); await ops.locator('article button:has-text("Remove")').click(); await ops.waitForTimeout(800); await ops.reload();
  check('removed after switching back to the sample', (await ops.locator('main').innerText()).includes('No suppliers connected yet'));
  check('no page errors ' + JSON.stringify(errors), !errors.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
