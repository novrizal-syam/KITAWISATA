// Local stand-in for Midtrans and Xendit, for end-to-end tests only. Implements the endpoints the app
// calls, a payment page, and the notifications each provider sends.
const http = require('http'); const crypto = require('crypto');
const PORT = 4010, APP = process.env.APP || 'http://localhost:3000';
const MID_KEY = process.env.MID_KEY, XND_TOKEN = process.env.XND_TOKEN;
const mid = new Map(), xnd = new Map(); const log = [];
const send = (res, status, body, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });
const auth = (req, key) => req.headers.authorization === 'Basic ' + Buffer.from(key + ':').toString('base64');
async function notifyMidtrans(o) {
  const gross = o.gross_amount.toFixed(2), code = o.status === 'settlement' ? '200' : o.status === 'expire' ? '407' : '201';
  const body = { order_id: o.order_id, status_code: code, gross_amount: gross, transaction_status: o.status, fraud_status: 'accept', payment_type: 'bank_transfer',
    signature_key: crypto.createHash('sha512').update(o.order_id + code + gross + MID_KEY).digest('hex') };
  const r = await fetch(APP + '/api/payments/midtrans/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  log.push({ to: 'midtrans', order: o.order_id, status: r.status, body: await r.json().catch(() => null) });
}
async function notifyXendit(i) {
  const body = { id: i.id, external_id: i.external_id, status: i.status, amount: i.amount, paid_amount: i.status === 'PAID' ? i.amount : undefined };
  const r = await fetch(APP + '/api/payments/xendit/callback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-callback-token': XND_TOKEN }, body: JSON.stringify(body) });
  log.push({ to: 'xendit', order: i.external_id, status: r.status, body: await r.json().catch(() => null) });
}
const page = (title, amount, payHref, expireHref) => `<!doctype html><title>${title}</title><h1>${title}</h1><p id="amount">Rp ${amount}</p><a id="pay" href="${payHref}">Pay</a> <a id="expire" href="${expireHref}">Let it expire</a>`;
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname;
  // Midtrans
  if (req.method === 'POST' && p === '/snap/v1/transactions') {
    if (!auth(req, MID_KEY)) return send(res, 401, { error_messages: ['Access denied'] });
    const b = await readBody(req); const token = crypto.randomBytes(8).toString('hex');
    mid.set(b.transaction_details.order_id, { order_id: b.transaction_details.order_id, gross_amount: b.transaction_details.gross_amount, finish: b.callbacks.finish, token, status: null, expiry: b.expiry });
    return send(res, 201, { token, redirect_url: `http://localhost:${PORT}/pay/midtrans/${b.transaction_details.order_id}` });
  }
  let m = p.match(/^\/v2\/([^/]+)\/status$/);
  if (m && req.method === 'GET') {
    if (!auth(req, MID_KEY)) return send(res, 401, { status_code: '401' });
    const o = mid.get(decodeURIComponent(m[1]));
    if (!o || !o.status) return send(res, 404, { status_code: '404', status_message: "Transaction doesn't exist." });
    return send(res, 200, { status_code: o.status === 'settlement' ? '200' : '407', transaction_status: o.status, fraud_status: 'accept', gross_amount: o.gross_amount.toFixed(2), order_id: o.order_id });
  }
  m = p.match(/^\/pay\/midtrans\/([^/]+)(\/(pay|expire))?$/);
  if (m) {
    const o = mid.get(decodeURIComponent(m[1])); if (!o) return send(res, 404, 'no such order', 'text/plain');
    if (!m[3]) return send(res, 200, page('Midtrans test payment', o.gross_amount, `${p}/pay`, `${p}/expire`), 'text/html');
    o.status = m[3] === 'pay' ? 'settlement' : 'expire'; await notifyMidtrans(o);
    res.writeHead(302, { Location: o.finish }); return res.end();
  }
  // Xendit
  if (req.method === 'POST' && p === '/v2/invoices') {
    if (!auth(req, process.env.XND_KEY)) return send(res, 401, { message: 'invalid key' });
    const b = await readBody(req); const id = 'inv_' + crypto.randomBytes(6).toString('hex');
    xnd.set(id, { id, external_id: b.external_id, amount: b.amount, status: 'PENDING', success: b.success_redirect_url, failure: b.failure_redirect_url, duration: b.invoice_duration });
    return send(res, 200, { id, invoice_url: `http://localhost:${PORT}/pay/xendit/${id}`, status: 'PENDING' });
  }
  m = p.match(/^\/v2\/invoices\/([^/]+)$/);
  if (m && req.method === 'GET') {
    if (!auth(req, process.env.XND_KEY)) return send(res, 401, { message: 'invalid key' });
    const i = xnd.get(m[1]); if (!i) return send(res, 404, { message: 'not found' });
    return send(res, 200, { id: i.id, external_id: i.external_id, status: i.status, amount: i.amount, paid_amount: i.status === 'PAID' ? i.amount : undefined });
  }
  m = p.match(/^\/pay\/xendit\/([^/]+)(\/(pay|expire))?$/);
  if (m) {
    const i = xnd.get(m[1]); if (!i) return send(res, 404, 'no such invoice', 'text/plain');
    if (!m[3]) return send(res, 200, page('Xendit test invoice', i.amount, `${p}/pay`, `${p}/expire`), 'text/html');
    i.status = m[3] === 'pay' ? 'PAID' : 'EXPIRED'; await notifyXendit(i);
    res.writeHead(302, { Location: m[3] === 'pay' ? i.success : i.failure }); return res.end();
  }
  if (p === '/control/log') return send(res, 200, log);
  if (p === '/control/orders') return send(res, 200, { mid: [...mid.values()], xnd: [...xnd.values()] });
  send(res, 404, { message: 'unknown' });
}).listen(PORT, () => console.log('mock gateway on', PORT));
