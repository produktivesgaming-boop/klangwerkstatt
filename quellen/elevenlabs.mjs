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

// force_instrumental haelt Gesang zuverlaessig heraus, was ein Prompt allein nicht
// schafft; der seed macht dieselbe Bestellung wiederholbar, wie im ganzen Projekt.
export async function komponiere(stimmung, sekunden, { seed = null } = {}) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const antwort = await fetch(`${MUSIK_ENDPUNKT}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': schluessel, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: stimmung,
      music_length_ms: Math.round(sekunden * 1000),
      model_id: MUSIKMODELL,
      force_instrumental: true,
      ...(seed === null ? {} : { seed }),
    }),
  });
  if (!antwort.ok) throw new Error(`${antwort.status} ${await antwort.text()}`);

  return Buffer.from(await antwort.arrayBuffer());
}
