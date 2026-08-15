import test from 'node:test';
import assert from 'node:assert/strict';
import { stueckeAusStillen, leseStillen, istSammeldatei } from '../quellen/zerlegen.mjs';

const ffmpegAusgabe = `
[silencedetect @ 000001] silence_start: 0.85
[silencedetect @ 000001] silence_end: 1.42 | silence_duration: 0.57
[silencedetect @ 000001] silence_start: 2.10
[silencedetect @ 000001] silence_end: 2.75 | silence_duration: 0.65
`;

test('die Stillen werden aus der ffmpeg-Ausgabe gelesen', () => {
  assert.deepEqual(leseStillen(ffmpegAusgabe), [
    { start: 0.85, ende: 1.42 },
    { start: 2.1, ende: 2.75 },
  ]);
});

test('eine Stille am Dateiende bleibt offen', () => {
  const stillen = leseStillen('[x] silence_start: 3.5\n');
  assert.deepEqual(stillen, [{ start: 3.5, ende: null }]);
});

test('zwischen den Stillen liegen die einzelnen Klaenge', () => {
  const stuecke = stueckeAusStillen(leseStillen(ffmpegAusgabe), 3.4);
  assert.equal(stuecke.length, 3, 'drei Laute in einer Sammeldatei');
  assert.ok(stuecke[0].von < stuecke[0].bis);
  assert.ok(stuecke[1].von >= 1.3, 'das zweite Stueck beginnt nach der ersten Stille');
  assert.ok(stuecke[2].bis <= 3.4, 'kein Stueck ragt ueber die Datei hinaus');
});

test('winzige Reste zwischen zwei Stillen zaehlen nicht als Klang', () => {
  const stillen = [{ start: 1.0, ende: 1.5 }, { start: 1.51, ende: 2.0 }];
  const stuecke = stueckeAusStillen(stillen, 3, 0.2);
  assert.equal(stuecke.every((stueck) => stueck.bis - stueck.von >= 0.2), true);
});

test('ohne jede Stille bleibt die Datei ein einziges Stueck', () => {
  const stuecke = stueckeAusStillen([], 0.6);
  assert.equal(stuecke.length, 1);
  assert.equal(stuecke[0].von, 0);
});

test('eine Sammeldatei erkennt man an ihrer Laenge', () => {
  assert.equal(istSammeldatei(6.6, 0.5), true);
  assert.equal(istSammeldatei(41.7, 1.2), true);
  assert.equal(istSammeldatei(0.6, 0.5), false, 'ein einzelner Klang wird nicht zerlegt');
  assert.equal(istSammeldatei(null, 0.5), false, 'ohne Messung wird nicht zerlegt');
});
