export const NAME = 'ElevenLabs (erzeugt)';

const ENDPUNKT = 'https://api.elevenlabs.io/v1/sound-generation';

export function schluesselFehlt() {
  return !process.env.ELEVENLABS_API_KEY;
}

export async function erzeuge(beschreibung, { sekunden = 1.2, treue = 0.75 } = {}) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const antwort = await fetch(`${ENDPUNKT}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': schluessel, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: beschreibung, duration_seconds: sekunden, prompt_influence: treue }),
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
