import test from 'node:test';
import assert from 'node:assert/strict';
import { planFuer, dauerVon, ABSCHNITTE, NIE,
  KUERZESTER_ABSCHNITT_MS, LAENGSTER_ABSCHNITT_MS, HOECHSTENS_ABSCHNITTE } from '../quellen/komposition.mjs';
import { saatFuer } from '../bin/musik.mjs';

test('der Plan trifft die gewuenschte Gesamtdauer', () => {
  for (const sekunden of [30, 60, 90]) {
    assert.ok(Math.abs(dauerVon(planFuer(['warm accordion'], sekunden)) - sekunden) < 1,
      `bei ${sekunden} s kamen ${dauerVon(planFuer(['warm accordion'], sekunden))} s heraus`);
  }
});

test('jeder Abschnitt bleibt in den Grenzen der Schnittstelle', () => {
  for (const sekunden of [10, 60, 300]) {
    for (const teil of planFuer(['test'], sekunden).chunks) {
      assert.ok(teil.duration_ms >= KUERZESTER_ABSCHNITT_MS && teil.duration_ms <= LAENGSTER_ABSCHNITT_MS,
        `${teil.text} dauert ${teil.duration_ms} ms`);
    }
  }
});

test('der Plan bleibt unter der Hoechstzahl an Abschnitten', () => {
  assert.ok(planFuer(['test'], 600).chunks.length <= HOECHSTENS_ABSCHNITTE);
  assert.equal(planFuer(['test'], 60).chunks.length, ABSCHNITTE.length);
});

test('der letzte Abschnitt fuehrt zurueck, statt auszufaden', () => {
  const letzter = planFuer(['test'], 60).chunks.at(-1);

  assert.match(letzter.positive_styles.join(' '), /back to the opening/);
  assert.match(letzter.positive_styles.join(' '), /no fade out/);
});

test('Gesang wird in jedem Abschnitt ausgeschlossen', () => {
  for (const teil of planFuer(['test'], 60).chunks) {
    for (const unerwuenscht of ['vocals', 'lyrics']) {
      assert.ok(teil.negative_styles.includes(unerwuenscht), `${teil.text} laesst ${unerwuenscht} zu`);
    }
  }
  assert.ok(NIE.includes('fade out'));
});

test('die Stile des Auftrags stehen in jedem Abschnitt', () => {
  for (const teil of planFuer(['warm accordion', 'upright bass'], 60).chunks) {
    assert.ok(teil.positive_styles.includes('warm accordion'));
    assert.ok(teil.positive_styles.includes('upright bass'));
  }
});

test('derselbe Auftrag ergibt dieselbe Saat, verschiedene nicht', () => {
  assert.equal(saatFuer('kampf', 1), saatFuer('kampf', 1));
  assert.equal(new Set([saatFuer('kampf', 1), saatFuer('kampf', 2), saatFuer('menue', 1)]).size, 3);
});
