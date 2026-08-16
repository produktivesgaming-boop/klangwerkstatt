import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { schonVorhanden } from '../bin/vorschlaege.mjs';

function ordnerMit(dateien) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'klangprobe-'));
  for (const [name, inhalt] of Object.entries(dateien)) {
    fs.writeFileSync(path.join(ordner, name), inhalt);
  }
  return ordner;
}

function bestandVon(ordner) {
  return fs.readdirSync(ordner)
    .filter((datei) => datei !== 'herkunft.json')
    .map((datei) => ({ datei, daten: fs.readFileSync(path.join(ordner, datei)) }));
}

test('ein Teil, dessen Zwischendatei noch im Ordner liegt, gilt als Dublette seiner selbst', () => {
  const ordner = ordnerMit({ 'teil-1.ogg': 'derselbe Klang' });

  assert.equal(schonVorhanden(Buffer.from('derselbe Klang'), bestandVon(ordner)), 'teil-1.ogg',
    'genau daran scheiterte frueher jeder zerlegte Teil');
});

test('ist die Zwischendatei weggeraeumt, kommt der Teil durch', () => {
  const ordner = ordnerMit({ 'teil-1.ogg': 'derselbe Klang' });
  fs.unlinkSync(path.join(ordner, 'teil-1.ogg'));

  assert.equal(schonVorhanden(Buffer.from('derselbe Klang'), bestandVon(ordner)), null);
});

test('echte Dubletten aus einer anderen Quelle werden weiter erkannt', () => {
  const ordner = ordnerMit({ 'cc0-1.ogg': 'gleicher Inhalt', 'cc0-2.ogg': 'anderer Inhalt' });

  assert.equal(schonVorhanden(Buffer.from('gleicher Inhalt'), bestandVon(ordner)), 'cc0-1.ogg');
  assert.equal(schonVorhanden(Buffer.from('ganz neu'), bestandVon(ordner)), null);
});
