// Local stand-in for a supplier implementing the kitawisata supplier API (docs/suppliers.md), for e2e tests.
// GET /control/mode?m=ok|down|bad switches behaviour.
const http = require('http'); const crypto = require('crypto');
const PORT = 4020, KEY = process.env.SUP_KEY || 'sup-key-123'; let mode = 'ok'; const issued = [];
const offers = (s) => [['ca1', '06.00', '08.50', 1_390_000], ['ca2', '12.15', '15.05', 1_520_000], ['ca3', '19.30', '22.20', 1_455_000]]
  .map(([id, dep, arr, fare]) => ({ id: `${id}-${s.from}-${s.to}-${s.date}`, kind: 'FLIGHT', carrier: 'Contoh Air', depart: dep, arrive: arr, duration: '1h 50m', baggageKg: 20, farePerPax: fare, total: fare * s.pax }));
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (status, b) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
  if (u.pathname === '/control/mode') { mode = u.searchParams.get('m'); return send(200, { mode }); }
  if (u.pathname === '/control/issued') return send(200, issued);
  if (mode === 'down') { res.destroy(); return; }
  if (req.headers.authorization !== 'Bearer ' + KEY) return send(401, { error: 'bad key' });
  const b = await body(req);
  if (u.pathname === '/kw/v1/search') return send(200, mode === 'bad' ? { offers: [{ id: 'x', kind: 'FLIGHT', total: 'cheap' }] } : { offers: b.kind === 'FLIGHT' ? offers(b.search) : [] });
  if (u.pathname === '/kw/v1/reprice') return send(200, { offer: offers(b.search).find((o) => o.id === b.offerId) ?? null });
  if (u.pathname === '/kw/v1/issue') { const ref = 'CA-PNR-' + crypto.randomBytes(3).toString('hex').toUpperCase(); issued.push({ code: b.booking.code, ref }); return send(200, { ref }); }
  send(404, { error: 'unknown' });
}).listen(PORT, () => console.log('mock supplier on', PORT));
