import test from 'node:test';
import assert from 'node:assert/strict';
import { naechsteNummer, istBrauchbar } from '../bin/vorschlaege.mjs';

test('ein leerer Ordner faengt bei eins an', () => {
  assert.equal(naechsteNummer([], 'ki'), 1);
  assert.equal(naechsteNummer(['herkunft.json'], 'ki'), 1);
});

test('vorhandene Kandidaten werden NICHT ueberschrieben', () => {
  const bestand = ['ki-1.mp3', 'ki-2.mp3', 'ki-3.mp3', 'ki-4.mp3', 'ki-5.mp3', 'herkunft.json'];
  assert.equal(naechsteNummer(bestand, 'ki'), 6);
});

test('jede Quelle zaehlt fuer sich', () => {
  const bestand = ['cc0-1.ogg', 'cc0-2.wav', 'ki-1.mp3'];
  assert.equal(naechsteNummer(bestand, 'cc0'), 3);
  assert.equal(naechsteNummer(bestand, 'ki'), 2);
});

test('Luecken fuellt es nicht auf, es zaehlt hinter dem Hoechsten weiter', () => {
  assert.equal(naechsteNummer(['ki-1.mp3', 'ki-7.mp3'], 'ki'), 8);
});

test('Dateien ohne Nummer stoeren nicht', () => {
  assert.equal(naechsteNummer(['cc0.ogg', 'cc0-alt.ogg', 'cc0-2.ogg'], 'cc0'), 3);
});

test('zu lange Kandidaten gelten als unbrauchbar', () => {
  assert.equal(istBrauchbar(0.6, 0.5), true, 'ein kurzer Ausruf passt');
  assert.equal(istBrauchbar(1.4, 0.5), true, 'etwas Luft bleibt erlaubt');
  assert.equal(istBrauchbar(6.6, 0.5), false, 'eine Sammeldatei ist kein Einzelklang');
  assert.equal(istBrauchbar(41.7, 1.2), false);
});

test('ohne Messung wird nichts verworfen', () => {
  assert.equal(istBrauchbar(null, 0.5), true);
});
