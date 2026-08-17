/** Bezug auf ein VORHANDENES Stueck: hochladen und darauf aufbauend komponieren.
 *
 * Eleven Music hat keinen eigenen Endpunkt zum Verlaengern. Der Weg fuehrt ueber
 * Inpainting: die fertige Datei wird hochgeladen und bekommt eine song_id,
 * danach mischt ein Kompositionsplan UNVERAENDERTE Ausschnitte dieses Stuecks
 * (Bezugsabschnitte, nur song_id und range) mit neu erzeugten Abschnitten.
 * Belegt am 17.08.2026 an ki-1 der Kampfmusik, Antwort 200 samt song_id.
 *
 * Neu erzeugte Abschnitte tragen zusaetzlich conditioning_ref auf denselben
 * Ausschnitt: ohne das erfindet das Modell zwar passende, aber fremde Musik.
 * Der Ausschnitt darf hoechstens 30 s lang sein (BEZUG_HOECHSTENS_MS).
 */
import { NIE } from './komposition.mjs';

const UPLOAD_ENDPUNKT = 'https://api.elevenlabs.io/v1/music/upload';

export const BEZUG_HOECHSTENS_MS = 30_000;

export async function ladeHoch(daten, dateiname) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const formular = new FormData();
  formular.append('file', new Blob([daten], { type: 'audio/mpeg' }), dateiname);
  formular.append('extract_composition_plan', 'true');

  const antwort = await fetch(UPLOAD_ENDPUNKT, {
    method: 'POST', headers: { 'xi-api-key': schluessel }, body: formular,
  });
  if (!antwort.ok) throw new Error(`${antwort.status} ${await antwort.text()}`);
  return antwort.json();
}

export function bezugsausschnitt(dauerMs) {
  return { start_ms: 0, end_ms: Math.min(BEZUG_HOECHSTENS_MS, Math.round(dauerMs)) };
}

/** Plan: erst das Original unveraendert, danach die beschriebenen Fortsetzungen.
 *
 * Der letzte Abschnitt fuehrt zum Anfang zurueck, damit das laengere Stueck
 * genauso schleifenfaehig bleibt wie das Original (Jonas, 17.08.2026).
 */
export function planMitBezug(songId, dauerMs, fortsetzungen) {
  const bereich = bezugsausschnitt(dauerMs);
  return {
    chunks: [
      { song_id: songId, range: { start_ms: 0, end_ms: Math.round(dauerMs) } },
      ...fortsetzungen.map((abschnitt) => ({
        text: `[${abschnitt.name}]`,
        duration_ms: abschnitt.dauerMs,
        positive_styles: abschnitt.stile,
        negative_styles: NIE,
        context_adherence: 'high',
        conditioning_ref: { song_id: songId, range: bereich },
        condition_strength: abschnitt.bezugsstaerke ?? 'high',
      })),
    ],
  };
}
