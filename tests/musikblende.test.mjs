import test from 'node:test';
import assert from 'node:assert/strict';
import { anteile } from '../browser/musikblende.mjs';

test('am Anfang laeuft nur die alte Spur', () => {
  const { neu, alt } = anteile(0);
  assert.equal(neu, 0);
  assert.equal(alt, 1);
});

test('am Ende laeuft nur die neue Spur', () => {
  const { neu, alt } = anteile(1);
  assert.equal(Math.round(neu), 1);
  assert.ok(alt < 1e-9);
});

test('die Gesamtlautstaerke bleibt waehrend der Blende konstant', () => {
  for (let schritt = 0; schritt <= 20; schritt++) {
    const { neu, alt } = anteile(schritt / 20);
    const summe = neu * neu + alt * alt;
    assert.ok(Math.abs(summe - 1) < 1e-9,
      `bei ${schritt / 20} saeckt die Musik ab (Leistungssumme ${summe.toFixed(4)})`);
  }
});

test('Werte ausserhalb der Blende werden geklemmt', () => {
  assert.deepEqual(anteile(-3), anteile(0));
  assert.deepEqual(anteile(7), anteile(1));
});
