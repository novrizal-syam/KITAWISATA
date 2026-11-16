const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const LOG = process.argv[2], BASE = 'http://localhost:3000', MOCK = 'http://localhost:4010'; const errors = [];
const check = (l, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) process.exitCode = 1; };
const sql = (q) => execSync(`docker compose exec -T db psql -U kitawisata -tAc "${q.replace(/"/g, '\\"')}"`, { cwd: process.cwd() }).toString().trim();
async function login(b, phone, cb) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage(); p.on('pageerror', e => errors.push(phone + ': ' + e.message));
  await p.goto(BASE + '/login?callbackUrl=' + encodeURIComponent(cb)); await p.fill('input[name=phone]', phone); await p.click('form button.btn-red'); await p.waitForSelector('input[name=code]');
  const code = [...fs.readFileSync(LOG, 'utf8').matchAll(new RegExp('\\+62' + phone.slice(1) + ' -> (\\d{6})', 'g'))].pop()[1];
  await p.fill('input[name=code]', code); await p.click('form button.btn-red'); await p.waitForURL(u => !u.pathname.startsWith('/login')); return p;
}
(async () => {
  const b = await chromium.launch();
  const ops = await login(b, '081100000009', '/portal/payments');
  await ops.check('input[value=MIDTRANS]'); await ops.fill('input[name=bankName]', 'BCA'); await ops.fill('input[name=bankAccountNumber]', '1234567890'); await ops.fill('input[name=bankAccountHolder]', 'PT Kita Wisata Demo');
  await ops.fill('input[name=serverKey]', 'SB-Mid-server-LOCALTEST'); await ops.click('button:has-text("Save payment settings")'); await ops.locator('main [role=status]:has-text("Saved")').waitFor();
  const invId = sql(`select id from "Invoice" where number like '%/0027'`);
  const sari = await login(b, '081100000003', '/portal/invoices/' + invId); await sari.locator('article').waitFor();
  check('unpaid invoice offers Pay Rp 35.855.000 now', (await sari.locator('article').innerText()).includes('Pay Rp 35.855.000 now') && (await sari.locator('article').innerText()).includes('Or pay by bank transfer'));
  // Open two payment pages; pay the second; then the first
  await sari.click('button:has-text("Pay Rp 35.855.000 now")'); await sari.waitForURL(MOCK + '/pay/midtrans/**'); const firstUrl = sari.url();
  check('Midtrans page for the invoice total', (await sari.locator('#amount').innerText()) === 'Rp 35855000');
  await sari.goto(BASE + '/portal/invoices/' + invId); await sari.click('button:has-text("Pay Rp 35.855.000 now")'); await sari.waitForURL(MOCK + '/pay/midtrans/**');
  const order = (await (await fetch(MOCK + '/control/orders')).json()).mid.find(o => sari.url().endsWith(encodeURIComponent(o.order_id)) || sari.url().endsWith(o.order_id));
  check('order id derived from invoice number; expiry capped at 7 days', /^INV-KW-\d{4}-\d{2}-0027-[A-Z0-9]{4}$/.test(order.order_id) && order.expiry.duration <= 7 * 1440 && order.expiry.duration >= 60);
  await sari.click('#pay'); await sari.waitForURL(BASE + '/pay/return**'); await sari.locator('h1').waitFor();
  check('return page: payment received', (await sari.locator('h1').innerText()) === 'Payment received');
  await sari.click('a:has-text("View booking")'); await sari.waitForURL('**/portal/invoices/**'); await sari.locator('article').waitFor();
  const art = await sari.locator('article').innerText();
  check('invoice now paid, recorded by Midtrans', art.includes('Paid') && art.includes('recorded by Midtrans') && sql(`select status || ' ' || "paidRecordedBy" from "Invoice" where id='${invId}'`) === 'PAID Midtrans');
  check('no Pay now on a paid invoice', !art.includes('Pay Rp'));
  await sari.goto(firstUrl); await sari.click('#pay'); await sari.waitForURL(BASE + '/pay/return**'); await sari.locator('h1').waitFor();
  check('paying the leftover page: needs a check, not double-paid', (await sari.locator('h1').innerText()) === 'Payment received, needs a check' && sql(`select count(*) from "PaymentAttempt" where "invoiceId"='${invId}' and status='PAID_UNAPPLIED'`) === '1');
  await ops.goto(BASE + '/portal/payments'); check('ops sees the duplicate with the invoice number', (await ops.locator('main').innerText()).includes('INV/KW/') && (await ops.locator('main').innerText()).includes('invoice already paid'));
  // A traveller can't pay a company invoice by tampering with their own form
  const dewi = await login(b, '081100000010', '/my-trips/KW-DEMO26'); await dewi.locator('main h1').waitFor();
  await dewi.evaluate((id) => { const f = document.querySelector('input[name=kind]').form; f.querySelector('input[name=kind]').value = 'invoice'; f.querySelector('input[name=code]').value = id; }, invId);
  await dewi.click('button:has-text("now")'); await dewi.locator('main [role=alert]').waitFor();
  check('traveller refused: ' + await dewi.locator('main [role=alert]').innerText(), (await dewi.locator('main [role=alert]').innerText()).includes("Only your company's Finance admins"));
  check('no page errors ' + JSON.stringify(errors), !errors.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
