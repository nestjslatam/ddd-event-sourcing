/**
 * Boots EsModule with the `mongo` driver against a real, throwaway MongoDB and
 * exercises the write and read paths.
 *
 *   node scripts/verify-mongo-driver.js
 *
 * This is a script rather than a Jest spec on purpose. Under Jest,
 * mongodb-memory-server's handshake fails with "Missing required sub-document
 * 'driver' in the client metadata document" -- an incompatibility between it
 * and the bundled mongodb driver, unrelated to this library. Rather than mock
 * the very thing that was broken, the check runs outside Jest where a real
 * server starts.
 *
 * It exists because the mongo driver had five defects and NOT ONE of them was
 * reachable by the 184-test suite, which never booted the module:
 *
 *   1. forRoot opened the connection but never registered the models with
 *      forFeature, so the three providers taking an @InjectModel could not be
 *      constructed and the driver did not boot at all.
 *   2. getEventsByStreamId queried `{ streamId }`, a field the schema does not
 *      declare, so every read threw "Aggregate does not exist".
 *   3. persist aborted the transaction unconditionally in its catch, so
 *      anything failing after a successful commit reported "Cannot call
 *      abortTransaction after calling commitTransaction" and destroyed the
 *      real error.
 *   4. persist wrote inside a transaction without ensuring the collection
 *      existed, and MongoDB will not create one there -- so the first write to
 *      a fresh database always failed.
 *   5. EventsBridge left its change-stream handler unguarded, so a single
 *      undeserializable document surfaced as an unhandled 'error' event and
 *      took the process down.
 *
 * The expected output ends with the event written and read back. The
 * "Skipping an event the deserializer could not build" line is expected too:
 * the synthetic event here carries no EventMetadata, and the point is that the
 * bridge logs and continues rather than crashing.
 */

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { Test } = require('@nestjs/testing');
const { CqrsModule } = require('@nestjs/cqrs');
const es = require('../dist/libs/es');

(async () => {
  const rs = await MongoMemoryReplSet.create({
    replSet: { count: 1 }, binary: { version: '7.0.14' },
  });

  const mod = await Test.createTestingModule({
    imports: [CqrsModule.forRoot(), es.EsModule.forRoot({ driver: 'mongo', mongoUrl: rs.getUri() })],
  }).compile();
  await mod.init();

  // Un evento real y registrado: el deserializador lo exige, y sin él el
  // round trip falla por culpa del test, no de la librería.
  class OrderPlaced extends require('@nestjslatam/ddd-lib').DomainEvent {}
  Object.defineProperty(OrderPlaced, 'name', { value: 'OrderPlaced' });
  es.DomainEventClsRegistry.register(OrderPlaced);

  const store = mod.get(es.AbstractEventStore, { strict: false });
  const snaps = mod.get(es.AbstractSnapshotStore, { strict: false });
  console.log('  event store    ', store.constructor.name);
  console.log('  snapshot store ', snaps.constructor.name);
  console.log('  events bridge  ', mod.get(es.EventsBridge, { strict: false }).constructor.name);

  // Escribir y leer al nivel del driver. El round trip completo pasa además
  // por el serializador y el deserializador, que son otro subsistema con sus
  // propios límites conocidos; lo que se verifica aquí es el driver.
  await store.persist({
    aggregateId: 'order-1', eventId: 'evt-1', eventName: 'OrderPlaced',
    occurredOn: new Date(), position: 1, attributes: { total: 42 }, meta: {},
  });
  const raw = await store.eventStore.find({ aggregateId: 'order-1' });
  console.log('  escrito y leído', raw.length, raw[0] && raw[0].eventName);

  // Y la consulta que antes no encontraba nada: ahora llega hasta el
  // deserializador en vez de lanzar "Aggregate does not exist".
  let reached = 'ninguno';
  try { await store.getEventsByStreamId('order-1'); reached = 'sin error'; }
  catch (e) { reached = /does not exist/.test(e.message) ? 'NO ENCONTRÓ (regresión)' : 'encontró, falló al deserializar'; }
  console.log('  getEventsByStreamId', reached);

  await mod.close();
  await rs.stop();
  process.exit(0);
})().catch((e) => { console.error('  FALLO:', e.message); process.exit(1); });
