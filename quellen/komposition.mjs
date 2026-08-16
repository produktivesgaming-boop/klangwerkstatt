/** Baut Kompositionsplaene fuer Eleven Music (music_v2).
 *
 * Ein Plan ist eine Liste von chunks, je mit text, duration_ms (3 bis 120 s),
 * positive_styles und negative_styles. Hoechstens 30 chunks, zusammen 3 s bis
 * 10 min.
 *
 * Der Aufbau ist immer Einstieg, Hauptteil, Rueckfuehrung (Jonas, 16.08.2026):
 * der letzte Abschnitt fuehrt bewusst zum Anfang zurueck. Damit loest sich das
 * Schleifenproblem an der Wurzel, statt hinterher den besten Schnitt zu suchen.
 */
export const KUERZESTER_ABSCHNITT_MS = 3000;
export const LAENGSTER_ABSCHNITT_MS = 120_000;
export const HOECHSTENS_ABSCHNITTE = 30;

export const ABSCHNITTE = [
  { name: 'Intro', anteil: 0.2, zusatz: 'sparse, establishing the theme' },
  { name: 'Main', anteil: 0.55, zusatz: 'full arrangement, steady groove' },
  { name: 'Turnaround', anteil: 0.25, zusatz: 'winding back to the opening, no fade out, no ending' },
];

export const NIE = ['vocals', 'lyrics', 'singing', 'fade out', 'ending', 'applause'];

function begrenzt(millisekunden) {
  return Math.round(Math.min(LAENGSTER_ABSCHNITT_MS, Math.max(KUERZESTER_ABSCHNITT_MS, millisekunden)));
}

export function planFuer(stile, sekunden) {
  const gesamt = sekunden * 1000;
  return {
    chunks: ABSCHNITTE.map((abschnitt) => ({
      text: `[${abschnitt.name}]`,
      duration_ms: begrenzt(gesamt * abschnitt.anteil),
      positive_styles: [...stile, abschnitt.zusatz],
      negative_styles: NIE,
      context_adherence: 'high',
    })),
  };
}

export function dauerVon(plan) {
  return plan.chunks.reduce((summe, teil) => summe + teil.duration_ms, 0) / 1000;
}
