import test from 'node:test';
import assert from 'node:assert/strict';
import { moeglicheLaenge, KUERZESTER_KLANG, LAENGSTER_KLANG } from '../quellen/elevenlabs.mjs';

test('zu kurze Wuensche werden auf das kuerzeste Moegliche gehoben', () => {
  assert.equal(moeglicheLaenge(0.4), KUERZESTER_KLANG,
    'unter einer halben Sekunde lehnt ElevenLabs den Auftrag ganz ab');
  assert.equal(moeglicheLaenge(0.2), KUERZESTER_KLANG);
});

test('zu lange Wuensche werden gedeckelt', () => {
  assert.equal(moeglicheLaenge(120), LAENGSTER_KLANG);
});

test('moegliche Laengen bleiben, wie sie sind', () => {
  assert.equal(moeglicheLaenge(1.2), 1.2);
  assert.equal(moeglicheLaenge(0.7), 0.7);
});
