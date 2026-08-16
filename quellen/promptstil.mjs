/** Was ein Auftrag an ein KI-Klangmodell enthalten muss.
 *
 * Recherchiert am 16.08.2026 aus der ElevenLabs-Doku und der Praxis, nachdem
 * Jonas die Vorschlaege als unfundiert zurueckgewiesen hatte. Die Befunde:
 *
 *   1. KURZ schlaegt erzaehlend. "arrow impact into flesh, wet meaty thud" ist
 *      besser als "an arrow flies through the air and hits a body, making a
 *      wet sound as it penetrates". Lange Saetze verwaessern den Auftrag.
 *   2. Audio-Fachbegriffe wirken: foley, close-mic, dry, transient, professionally
 *      recorded. Das Modell kennt sie aus den Beschreibungen echter Bibliotheken.
 *   3. Die Struktur ist Objekt, Aktion, MATERIAL, RAUM, Klangcharakter. Fehlt das
 *      Material, fehlt die Textur; fehlt der Raum, wuerfelt das Modell den Hall.
 *   4. Ein Klang je Auftrag. Abfolgen ("laeuft und faellt dann") gehoeren
 *      getrennt erzeugt und hinterher zusammengelegt.
 *   5. Der prompt_influence entscheidet ueber Naehe zum Auftrag. Ein fester Wert
 *      liefert vier Fassungen derselben Idee; gestreute Werte oeffnen die Spanne
 *      zwischen woertlich und frei.
 */

export const GRUNDTON = 'sound effects foley, professionally recorded, close-mic, '
  + 'dry studio, single hit, no music, no reverb tail, mono';

export const TREUESTUFEN = [0.9, 0.65, 0.4, 0.25];

export function treueFuer(stelle) {
  return TREUESTUFEN[stelle % TREUESTUFEN.length];
}

export function mitGrundton(beschreibung, grundton = GRUNDTON) {
  return `${beschreibung}. ${grundton}`;
}
