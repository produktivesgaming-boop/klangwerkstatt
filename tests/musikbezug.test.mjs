import test from 'node:test';
import assert from 'node:assert/strict';
import { planMitBezug, bezugsausschnitt,
  BEZUG_HOECHSTENS_MS } from '../quellen/musikbezug.mjs';

const FORTSETZUNG = [
  { name: 'Build', dauerMs: 24000, stile: ['marimba'] },
  { name: 'Turnaround', dauerMs: 16000, stile: ['marimba'] },
];

test('das Original steht als erster Abschnitt im Plan', () => {
  const plan = planMitBezug('lied-1', 25025, FORTSETZUNG);

  assert.deepEqual(plan.chunks[0], { song_id: 'lied-1', range: { start_ms: 0, end_ms: 25025 } });
  assert.equal(plan.chunks.length, 3);
});

test('jede Fortsetzung bezieht sich hoerbar auf das Original', () => {
  const plan = planMitBezug('lied-1', 25025, FORTSETZUNG);

  for (const abschnitt of plan.chunks.slice(1)) {
    assert.equal(abschnitt.conditioning_ref.song_id, 'lied-1');
    assert.equal(abschnitt.condition_strength, 'high');
  }
});

// Die Schnittstelle nimmt hoechstens 30 s als Bezugsausschnitt an; ein
// laengeres Stueck muss beschnitten werden, sonst antwortet sie mit 422.
test('der Bezugsausschnitt bleibt in der erlaubten Laenge', () => {
  assert.deepEqual(bezugsausschnitt(12000), { start_ms: 0, end_ms: 12000 });
  assert.deepEqual(bezugsausschnitt(90000), { start_ms: 0, end_ms: BEZUG_HOECHSTENS_MS });

  const plan = planMitBezug('lang', 90000, FORTSETZUNG);
  assert.equal(plan.chunks[1].conditioning_ref.range.end_ms, BEZUG_HOECHSTENS_MS);
  assert.equal(plan.chunks[0].range.end_ms, 90000, 'unveraendert uebernommen wird das GANZE Stueck');
});

test('der letzte Abschnitt fuehrt zum Anfang zurueck, damit es weiter loopt', () => {
  const plan = planMitBezug('lied-1', 25025, FORTSETZUNG);
  const letzter = plan.chunks.at(-1);

  assert.ok(letzter.negative_styles.includes('fade out'));
  assert.ok(letzter.negative_styles.includes('ending'));
});
