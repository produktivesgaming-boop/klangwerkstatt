export const NAME = 'ElevenLabs (erzeugt)';

const ENDPUNKT = 'https://api.elevenlabs.io/v1/sound-generation';

export const KLANGMODELL = 'eleven_text_to_sound_v2';
export const MUSIKMODELL = 'music_v2';
export const KUERZESTER_KLANG = 0.5;
export const LAENGSTER_KLANG = 30;

export function schluesselFehlt() {
  return !process.env.ELEVENLABS_API_KEY;
}

export function moeglicheLaenge(sekunden) {
  return Math.min(LAENGSTER_KLANG, Math.max(KUERZESTER_KLANG, sekunden));
}

// schleife: true laesst das Modell selbst nahtlos schliessen, statt den Schnitt
// hinterher von Hand zu suchen. Nur das v2-Modell kann das.
export async function erzeuge(beschreibung, { sekunden = 1.2, treue = 0.75, schleife = false } = {}) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const antwort = await fetch(`${ENDPUNKT}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': schluessel, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: beschreibung,
      duration_seconds: moeglicheLaenge(sekunden),
      prompt_influence: treue,
      model_id: KLANGMODELL,
      loop: schleife,
    }),
  });
  if (!antwort.ok) throw new Error(`${antwort.status} ${await antwort.text()}`);

  return {
    titel: beschreibung.slice(0, 60),
    herkunft: 'ElevenLabs sound-generation',
    lizenz: 'erzeugt',
    quelle: NAME,
    daten: Buffer.from(await antwort.arrayBuffer()),
  };
}

const MUSIK_ENDPUNKT = 'https://api.elevenlabs.io/v1/music';

// Komponiert wird IMMER ueber einen Plan, nie ueber einen blossen Auftragstext
// (Jonas, 16.08.2026). Nur mit Plan nimmt die API einen seed an (mit prompt
// antwortet sie 422), und nur mit seed ist ein Stueck spaeter nachbestellbar.
// Der Plan bestimmt ausserdem die Abschnitte, sodass das letzte Stueck zum
// Anfang zurueckfuehrt, statt auszufaden. Gesang haelt der Plan ueber seine
// negative_styles heraus; force_instrumental waere hier ein Fehler, das nimmt
// die Schnittstelle nur zusammen mit prompt an (422, gemessen 16.08.2026).
export async function komponiere(plan, { seed = null, dauernGenau = true } = {}) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const antwort = await fetch(`${MUSIK_ENDPUNKT}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': schluessel, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      composition_plan: plan,
      model_id: MUSIKMODELL,
      respect_sections_durations: dauernGenau,
      store_for_inpainting: true,
      ...(seed === null ? {} : { seed }),
    }),
  });
  if (!antwort.ok) throw new Error(`${antwort.status} ${await antwort.text()}`);

  return Buffer.from(await antwort.arrayBuffer());
}
