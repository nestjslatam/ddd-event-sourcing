/**
 * Boots the BankAccount sample against a real, throwaway MongoDB and exercises
 * its HTTP surface end to end.
 *
 *   npm run build && node scripts/verify-sample.js
 *
 * The sample did not start at all, and behind that stood four more defects
 * that only became reachable once it did -- each hidden by the one before it:
 *
 *   1. BankAccountModule imported the bare EsModule class. forRoot returns a
 *      dynamic module and Nest does not hoist its providers, so the feature
 *      module got the static @Module -- no providers, nothing exported -- and
 *      the app failed on EnhancedAggregateRehydrator's AbstractEventStore.
 *   2. EnhancedAggregateRehydrator called loadFromHistory once per event.
 *      It takes the whole array, so this threw
 *      "TypeError: history.forEach is not a function" on the first replay --
 *      meaning the rehydrator with snapshot support had never worked.
 *   3. The same method built the aggregate as `new Cls(aggregateId)`, putting
 *      the id in the props slot, so the first event handler to assign a field
 *      threw "Cannot create property 'holderName' on string".
 *   4. The sample's events took only positional domain arguments, but the
 *      deserializer rebuilds an event as `new EventClass(metadata)`. On every
 *      replay `accountId` received the metadata object, aggregateId became
 *      that object, and the projector wrote it into a string `_id`.
 *
 * Expected output: every line a 2xx, and the two malformed requests a 400.
 */

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const http = require('http');
const req = (method, path, body) => new Promise((res) => {
  const data = body ? JSON.stringify(body) : null;
  const r = http.request({ host: '127.0.0.1', port: 5899, path, method,
    headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} },
    (x) => { let b=''; x.on('data', c=>b+=c); x.on('end', ()=>res({ code: x.statusCode, body: b.slice(0,120) })); });
  r.on('error', () => res({ code: 0, body: 'sin conexión' }));
  if (data) r.write(data); r.end();
});
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  let errs = '';
  const child = spawn('node', [require('path').join(__dirname, '..', 'dist', 'main.js')], { env: { ...process.env, MONGODB_URI: rs.getUri(), EVENT_STORE_URL: rs.getUri(), PORT: '5899' } });
  let up = false;
  child.stdout.on('data', d => { errs += d; if (/successfully started/.test(String(d))) up = true; });
  child.stderr.on('data', d => { errs += d; });
  child.on('exit', () => {});
  for (let i = 0; i < 40 && !up; i++) await wait(500);
  console.log('  arranca               ', up ? 'sí' : 'NO');
  if (up) {
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    console.log('  POST /bank-accounts   ', (await req('POST','/bank-accounts',{accountId:id,holderName:'Ada',initialAmount:100,currency:'USD'})).code);
    console.log('  id no-UUID -> 400     ', (await req('POST','/bank-accounts',{accountId:'acc-123',holderName:'Ada',initialAmount:100,currency:'USD'})).code);
    console.log('  path id malo -> 400   ', (await req('POST','/bank-accounts/acc-123/deposit',{amount:10})).code);
    console.log('  amount 0 -> 400       ', (await req('POST',`/bank-accounts/${id}/deposit`,{amount:0})).code);
    console.log('  deposit válido        ', (await req('POST',`/bank-accounts/${id}/deposit`,{amount:50})).code);
    await wait(1500);   // el proyector escribe el read model de forma asíncrona
    const view = await req('GET', `/bank-accounts/${id}`);
    console.log('  GET (read model)      ', view.code, view.body.slice(0, 80));
    console.log('  GET id inexistente    ', (await req('GET','/bank-accounts/f47ac10b-58cc-4372-a567-0e02b2c3d000')).code);
  }
  await wait(3000);
  require('fs').writeFileSync('/tmp/server.log', errs);
  try { child.kill(); } catch {}
  await rs.stop(); process.exit(up ? 0 : 1);
})();
