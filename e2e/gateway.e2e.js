const { chromium } = require('playwright'); const fs = require('fs'); const crypto = require('crypto'); const { execSync } = require('child_process');
const LOG = process.argv[2], OUT = process.argv[3], BASE = 'http://localhost:3000', MOCK = 'http://localhost:4010'; const errors = [];
const check = (l, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + l); if (!ok) process.exitCode = 1; };
const sql = (q) => execSync(`docker compose exec -T db psql -U kitawisata -tAc "${q.replace(/"/g, '\\"')}"`, { cwd: process.cwd() }).toString().trim();
const d = (n) => { const x = new Date(Date.now() + 7 * 3600e3); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const mockLog = async () => (await fetch(MOCK + '/control/log')).json();
async function signIn(p, phone) {
  await p.fill('input[name=phone]', phone); await p.click('form button.btn-red'); await p.waitForSelector('input[name=code]');
  const code = [...fs.readFileSync(LOG, 'utf8').matchAll(new RegExp('\\+62' + phone.slice(1) + ' -> (\\d{6})', 'g'))].pop()[1];
  await p.fill('input[name=code]', code); await p.click('form button.btn-red'); await p.waitForURL(u => !u.pathname.startsWith('/login'));
}
async function saveProvider(ops, provider, fields) {
  await ops.goto(BASE + '/portal/payments'); await ops.check(`input[value=${provider}]`);
  await ops.fill('input[name=bankName]', 'BCA'); await ops.fill('input[name=bankAccountNumber]', '1234567890'); await ops.fill('input[name=bankAccountHolder]', 'PT Kita Wisata Demo');
  for (const [k, v] of Object.entries(fields)) await ops.fill(`input[name=${k}]`, v);
  await ops.click('button:has-text("Save payment settings")'); await ops.locator('main [role=status]:has-text("Saved")').waitFor(); await ops.reload();
}
(async () => {
  const b = await chromium.launch();
  const ops = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage(); ops.on('pageerror', e => errors.push('ops: ' + e.message));
  await ops.goto(BASE + '/login?callbackUrl=/portal/payments'); await signIn(ops, '081100000009');
  // ---- Midtrans ----
  await saveProvider(ops, 'MIDTRANS', { serverKey: 'SB-Mid-server-LOCALTEST', clientKey: 'SB-Mid-client-LOCALTEST' });
  let main = await ops.locator('main').innerText();
  check('settings: online payment on, webhook URL shown', main.includes('Online payment is on') && main.includes('http://localhost:3000/api/payments/midtrans/notify'));
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })).newPage(); p.on('pageerror', e => errors.push('traveller: ' + e.message));
  await p.goto(BASE + '/trips/lbj'); await p.click('a:has-text("Book now")'); await signIn(p, '081299990003'); await p.locator('h1:has-text("Your booking")').waitFor();
  await p.fill('input[name=contactName]', 'Maya Sari'); await p.fill('input[name=contactPhone]', '0812 9999 0003');
  await p.locator('input[name=travellerName]').nth(0).fill('Maya Sari'); await p.locator('input[name=travellerName]').nth(1).fill('Joko Sari');
  await p.check('input[name=acceptTerms]'); await p.click('button:has-text("Hold my seats")'); await p.waitForURL(/held=1/);
  const code = p.url().match(/KW-[A-Z0-9]{6}/)[0];
  check('booking shows Pay now with the bank option as fallback', (await p.locator('main').innerText()).includes('Pay Rp 1.470.000 now') && (await p.locator('main').innerText()).includes('Or pay by bank transfer'));
  await p.click('button:has-text("Pay Rp 1.470.000 now")'); await p.waitForURL(MOCK + '/pay/midtrans/**');
  check('sent to Midtrans page for Rp 1470000', (await p.locator('#amount').innerText()) === 'Rp 1470000');
  const orderId = decodeURIComponent(p.url().split('/').pop());
  const order = (await (await fetch(MOCK + '/control/orders')).json()).mid.find(o => o.order_id === orderId);
  check('Snap expiry matches the remaining hold (~24 h)', order.expiry.unit === 'minute' && order.expiry.duration > 1400 && order.expiry.duration <= 1440);
  await p.click('#pay'); await p.waitForURL(BASE + '/pay/return**'); await p.locator('h1').waitFor();
  check('return page: payment received', (await p.locator('h1').innerText()) === 'Payment received');
  check('notification accepted (200, paid or already)', (await mockLog()).some(l => l.order === orderId && l.status === 200));
  await p.click('a:has-text("View booking")'); await p.waitForURL(u => u.pathname.startsWith('/my-trips/KW-')); await p.locator('main h1').waitFor(); main = await p.locator('main').innerText();
  check('booking confirmed, down payment paid', main.includes('Confirmed') && main.includes('Rp 1.470.000 paid of Rp 4.900.000'));
  check('recorded as paid by Midtrans', sql(`select i."paidRecordedBy" from "OpenTripInstalment" i join "OpenTripBooking" b on b.id=i."bookingId" where b.code='${code}' and i.seq=1`) === 'Midtrans');
  check('next instalment can be paid online too', main.includes('Pay Rp 1.715.000 now'));
  // Replay, forgery
  const gross = '1470000.00', sig = (o, c, g, k) => crypto.createHash('sha512').update(o + c + g + k).digest('hex');
  const post = (body) => fetch(BASE + '/api/payments/midtrans/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let r = await post({ order_id: orderId, status_code: '200', gross_amount: gross, transaction_status: 'settlement', signature_key: sig(orderId, '200', gross, 'SB-Mid-server-LOCALTEST') });
  check('replayed notification: 200, already recorded', r.status === 200 && (await r.json()).outcome === 'already' && sql(`select count(*) from "OpenTripInstalment" i join "OpenTripBooking" b on b.id=i."bookingId" where b.code='${code}' and i."paidAt" is not null`) === '1');
  r = await post({ order_id: orderId, status_code: '200', gross_amount: gross, transaction_status: 'settlement', signature_key: sig(orderId, '200', gross, 'wrong-key') });
  check('forged signature refused (' + r.status + ')', r.status === 401);
  r = await post({ order_id: 'KW-NOPE-1-AAAA', status_code: '200', gross_amount: gross, transaction_status: 'settlement', signature_key: sig('KW-NOPE-1-AAAA', '200', gross, 'SB-Mid-server-LOCALTEST') });
  check('unknown order refused (' + r.status + ')', r.status === 404);
  // Late payment for a lapsed ticket -> needs review
  await p.goto(`${BASE}/travel/trains?from=GMR&to=YK&date=${d(10)}&pax=1`); await p.locator('main ul li').first().locator('a:has-text("Select")').click();
  await p.locator('h1:has-text("Your booking")').waitFor(); await p.fill('input[name=contactName]', 'Maya Sari'); await p.locator('input[name=travellerName]').fill('Maya Sari');
  await p.click('button:has-text("Book")'); await p.waitForURL(/created=1/); const tcode = p.url().match(/KT-[A-Z0-9]{6}/)[0];
  await p.click('button:has-text("now")'); await p.waitForURL(MOCK + '/pay/midtrans/**');
  sql(`update "TicketBooking" set "holdExpiresAt" = now() - interval '1 minute' where code='${tcode}'`);
  await p.click('#pay'); await p.waitForURL(BASE + '/pay/return**'); await p.locator('h1').waitFor();
  check('late payment flagged on return page', (await p.locator('h1').innerText()) === 'Payment received, needs a check');
  check('ticket stays lapsed, attempt kept for review', sql(`select status from "TicketBooking" where code='${tcode}'`) === 'EXPIRED' && sql(`select status from "PaymentAttempt" where "orderId" like '${tcode}%'`) === 'PAID_UNAPPLIED');
  await ops.goto(BASE + '/portal/payments'); main = await ops.locator('main').innerText();
  check('ops sees it under payments needing review', main.includes('Payments needing review') && main.includes(tcode));
  ops.once('dialog', x => x.accept()); await ops.locator('button:has-text("Mark resolved")').click();
  await ops.waitForTimeout(800); await ops.reload(); check('resolved and cleared', !(await ops.locator('main').innerText()).includes('Payments needing review'));
  await ops.screenshot({ path: OUT + '/gw-settings.png', fullPage: true });
  // ---- Xendit ----
  await saveProvider(ops, 'XENDIT', { secretKey: 'xnd_development_LOCALTEST', callbackToken: 'cbtok-local-123' });
  check('xendit live with callback URL', (await ops.locator('main').innerText()).includes('http://localhost:3000/api/payments/xendit/callback') && (await ops.locator('main').innerText()).includes('Online payment is on'));
  await p.goto(`${BASE}/travel/flights?from=CGK&to=DPS&date=${d(20)}&pax=1`); await p.locator('main ul li').first().locator('a:has-text("Select")').click();
  await p.locator('h1:has-text("Your booking")').waitFor(); await p.fill('input[name=contactName]', 'Maya Sari'); await p.locator('input[name=travellerName]').fill('Maya Sari');
  await p.click('button:has-text("Book")'); await p.waitForURL(/created=1/); const xcode = p.url().match(/KT-[A-Z0-9]{6}/)[0];
  await p.click('button:has-text("now")'); await p.waitForURL(MOCK + '/pay/xendit/**'); const invId = p.url().split('/').pop();
  await p.click('#pay'); await p.waitForURL(BASE + '/pay/return**'); await p.locator('h1').waitFor();
  check('xendit: payment received', (await p.locator('h1').innerText()) === 'Payment received');
  check('ticket paid, recorded by Xendit', sql(`select status || ' ' || "paidRecordedBy" from "TicketBooking" where code='${xcode}'`) === 'PAID Xendit');
  const attemptOrder = sql(`select "orderId" from "PaymentAttempt" where "providerRef"='${invId}'`);
  r = await fetch(BASE + '/api/payments/xendit/callback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-callback-token': 'wrong' }, body: JSON.stringify({ id: invId, external_id: attemptOrder, status: 'PAID' }) });
  check('wrong callback token refused (' + r.status + ')', r.status === 401);
  // Expired invoice
  await p.goto(`${BASE}/travel/stays?city=Bali&date=${d(30)}&nights=1&pax=2`); await p.locator('main ul li').first().locator('a:has-text("Select room")').click();
  await p.locator('h1:has-text("Your booking")').waitFor(); await p.fill('input[name=contactName]', 'Maya Sari'); await p.locator('input[name=travellerName]').fill('Maya Sari');
  await p.click('button:has-text("Book")'); await p.waitForURL(/created=1/); const scode = p.url().match(/KT-[A-Z0-9]{6}/)[0];
  await p.click('button:has-text("now")'); await p.waitForURL(MOCK + '/pay/xendit/**'); await p.click('#expire'); await p.waitForURL(BASE + '/pay/return**'); await p.locator('h1').waitFor();
  check('expired invoice: told, booking still awaiting payment', (await p.locator('h1').innerText()) === 'Payment page expired' && sql(`select status from "TicketBooking" where code='${scode}'`) === 'AWAITING_PAYMENT');
  // Indonesian return page
  const idp = await (await b.newContext({ locale: 'id-ID' })).newPage(); await idp.context().addCookies(await p.context().cookies());
  await idp.goto(BASE + '/pay/return?order=' + encodeURIComponent(attemptOrder));
  check('return page in Indonesian', (await idp.locator('h1').innerText()) === 'Pembayaran diterima');
  check('no page errors ' + JSON.stringify(errors), !errors.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
