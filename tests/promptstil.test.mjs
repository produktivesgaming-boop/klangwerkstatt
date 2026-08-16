import test from 'node:test';
import assert from 'node:assert/strict';
import { GRUNDTON, TREUESTUFEN, treueFuer, mitGrundton } from '../quellen/promptstil.mjs';

test('der Grundton nennt die Aufnahmeart, nicht den Spielinhalt', () => {
  for (const begriff of ['foley', 'close-mic', 'dry', 'mono']) {
    assert.ok(GRUNDTON.includes(begriff), `im Grundton fehlt ${begriff}`);
  }
  assert.ok(!/wood|cardboard|toy/.test(GRUNDTON),
    'der Grundton gehoert allen Projekten, er darf keinen Materialstil vorgeben');
});

test('die Vorschlaege einer Runde bekommen verschiedene Treuegrade', () => {
  const runde = [0, 1, 2, 3].map(treueFuer);

  assert.equal(new Set(runde).size, runde.length,
    'gleiche Treue liefert vier Fassungen derselben Idee statt vier Ideen');
  assert.ok(Math.max(...runde) - Math.min(...runde) > 0.4, 'die Spanne ist zu eng');
});

test('die Treuegrade bleiben im erlaubten Bereich und wiederholen sich danach', () => {
  for (const stufe of TREUESTUFEN) assert.ok(stufe > 0 && stufe <= 1, `${stufe} liegt ausserhalb`);
  assert.equal(treueFuer(TREUESTUFEN.length), TREUESTUFEN[0]);
});

test('der Grundton haengt hinten an, damit die Beschreibung fuehrt', () => {
  const auftrag = mitGrundton('wet gore hit');

  assert.ok(auftrag.startsWith('wet gore hit'), 'die eigentliche Beschreibung steht vorn');
  assert.ok(auftrag.endsWith(GRUNDTON));
});

test('drei Treuegrade reichen fuer drei KI-Vorschlaege je Runde', () => {
  const dreiRunden = [0, 1, 2].map(treueFuer);

  assert.equal(new Set(dreiRunden).size, 3, 'auch drei Vorschlaege muessen sich unterscheiden');
});
