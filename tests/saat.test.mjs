import test from 'node:test';
import assert from 'node:assert/strict';
import { saatFuer } from '../bin/musik.mjs';

test('derselbe Auftrag ergibt dieselbe Saat', () => {
  assert.equal(saatFuer('kampf', 1), saatFuer('kampf', 1));
});

test('verschiedene Szenen und Nummern trennen sich', () => {
  const saaten = [saatFuer('kampf', 1), saatFuer('kampf', 2), saatFuer('menue', 1)];

  assert.equal(new Set(saaten).size, 3);
});

test('die Saat bleibt im erlaubten Zahlenbereich', () => {
  for (const szene of ['kampf', 'menue', 'statistik', 'credits']) {
    for (let nummer = 1; nummer <= 12; nummer++) {
      const saat = saatFuer(szene, nummer);
      assert.ok(Number.isInteger(saat) && saat >= 0 && saat < 2147483647, `${szene}-${nummer}: ${saat}`);
    }
  }
});
