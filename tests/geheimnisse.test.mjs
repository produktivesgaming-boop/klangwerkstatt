import test from 'node:test';
import assert from 'node:assert/strict';
import { zeilenZuWerten } from '../quellen/geheimnisse.mjs';

test('Kommentare und Leerzeilen bleiben aussen vor', () => {
  const werte = zeilenZuWerten('# nur ein Hinweis\n\nFREESOUND_API_KEY=abc123\n');

  assert.deepEqual(werte, { FREESOUND_API_KEY: 'abc123' });
});

test('Anfuehrungszeichen und Leerraum werden abgestreift', () => {
  const werte = zeilenZuWerten('EINS = "mit Anfuehrung"\nZWEI=\'einfach\'\n');

  assert.equal(werte.EINS, 'mit Anfuehrung');
  assert.equal(werte.ZWEI, 'einfach');
});

test('ein Wert mit Gleichheitszeichen bleibt vollstaendig', () => {
  assert.equal(zeilenZuWerten('TOKEN=abc=def==').TOKEN, 'abc=def==');
});
