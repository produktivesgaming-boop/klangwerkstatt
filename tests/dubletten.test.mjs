import test from 'node:test';
import assert from 'node:assert/strict';
import { schonVorhanden, pruefsumme } from '../bin/vorschlaege.mjs';

const bestand = [
  { datei: 'cc0-1.ogg', daten: Buffer.from('erster klang') },
  { datei: 'cc0-2.ogg', daten: Buffer.from('zweiter klang') },
];

test('eine Wort fuer Wort gleiche Aufnahme wird erkannt', () => {
  assert.equal(schonVorhanden(Buffer.from('zweiter klang'), bestand), 'cc0-2.ogg');
});

test('eine neue Aufnahme darf bleiben', () => {
  assert.equal(schonVorhanden(Buffer.from('dritter klang'), bestand), null);
});

test('ein leerer Ordner haelt nichts zurueck', () => {
  assert.equal(schonVorhanden(Buffer.from('irgendwas'), []), null);
});

test('dieselben Bytes ergeben dieselbe Pruefsumme', () => {
  assert.equal(pruefsumme(Buffer.from('abc')), pruefsumme(Buffer.from('abc')));
  assert.notEqual(pruefsumme(Buffer.from('abc')), pruefsumme(Buffer.from('abd')));
});
