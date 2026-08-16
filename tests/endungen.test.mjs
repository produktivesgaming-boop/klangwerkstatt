import test from 'node:test';
import assert from 'node:assert/strict';
import { KLANGENDUNGEN as imVerzeichnis } from '../bin/verzeichnis.mjs';
import { KLANGENDUNGEN as beiOpenGameArt } from '../quellen/opengameart.mjs';
import { KLANGENDUNGEN as beiKenney } from '../quellen/kenney.mjs';

const BEISPIELE = ['klang.wav', 'klang.ogg', 'klang.mp3', 'klang.flac', 'klang.aiff'];

test('was eine Quelle herunterlaedt, listet das Verzeichnis auch auf', () => {
  for (const quelle of [beiOpenGameArt, beiKenney]) {
    for (const datei of BEISPIELE.filter((name) => quelle.test(name))) {
      assert.ok(imVerzeichnis.test(datei),
        `${datei} wird geholt, taucht aber in keiner Vorschau auf und geht damit still verloren`);
    }
  }
});
