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

// Ein sanftes Intro kostet Drive: dieselben Stilworte klangen mit ruhigem
// Einstieg deutlich zahmer als ohne (Jonas, 16.08.2026). Ruhiges Aufbauen passt
// zu Menue und Statistik, nicht zum Kampf.
export const AUFBAU = {
  ruhig: [
    { name: 'Intro', anteil: 0.2, zusatz: 'sparse, establishing the theme' },
    { name: 'Main', anteil: 0.55, zusatz: 'full arrangement, steady groove' },
    { name: 'Turnaround', anteil: 0.25, zusatz: 'winding back to the opening, no fade out, no ending' },
  ],
  treibend: [
    { name: 'Drive', anteil: 0.45, zusatz: 'full energy from the first beat, no build-up, relentless' },
    { name: 'Push', anteil: 0.3, zusatz: 'keeps pushing, adds a counter rhythm, never lets up' },
    { name: 'Turnaround', anteil: 0.25, zusatz: 'stays at full energy and loops back, no fade out, no ending' },
  ],
  dynamisch: [
    { name: 'Theme', anteil: 0.15, zusatz: 'states the main theme with full energy from the first beat' },
    { name: 'Variation', anteil: 0.2, zusatz: 'the same theme with a new counter melody, more syncopation' },
    { name: 'Break', anteil: 0.12, zusatz: 'stripped down to very few instruments, quiet and tense, the theme only hinted at' },
    { name: 'Rebuild', anteil: 0.18, zusatz: 'layers return one by one over a driving bass line' },
    { name: 'Peak', anteil: 0.2, zusatz: 'full arrangement at the highest energy, the theme stated boldly' },
    { name: 'Turnaround', anteil: 0.15, zusatz: 'winding back to the opening theme, no fade out, no ending' },
  ],
};

export const ABSCHNITTE = AUFBAU.ruhig;

export const NIE = ['vocals', 'lyrics', 'singing', 'fade out', 'ending', 'applause'];

function begrenzt(millisekunden) {
  return Math.round(Math.min(LAENGSTER_ABSCHNITT_MS, Math.max(KUERZESTER_ABSCHNITT_MS, millisekunden)));
}

export function planFuer(stile, sekunden, aufbau = 'ruhig') {
  const gesamt = sekunden * 1000;
  return {
    chunks: (AUFBAU[aufbau] ?? AUFBAU.ruhig).map((abschnitt) => ({
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
