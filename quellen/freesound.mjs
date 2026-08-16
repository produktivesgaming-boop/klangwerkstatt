/** Freesound als dritte CC0-Quelle.
 *
 * Weit groesser als OpenGameArt und Kenney zusammen und mit echter Suche statt
 * UND-Verknuepfung, also duerfen hier auch mehrere Woerter stehen. Der Schluessel
 * kommt aus FREESOUND_API_KEY (Life-OS/.secrets/credentials.env); fehlt er,
 * entfaellt die Quelle stillschweigend, damit die anderen weiterlaufen.
 */
const SUCHE = 'https://freesound.org/apiv2/search/text/';

export const NAME = 'Freesound';

// CC-BY dazuzunehmen lohnt sich messbar (Jonas, 16.08.2026): bei "creature death"
// verdreifacht sich die Auswahl, bei "lawn mower engine" verdoppelt sie sich fast.
// NonCommercial bleibt draussen, es brachte nur wenige Treffer mehr und verbaut
// den kommerziellen Weg. Jeder CC-BY-Klang MUSS in die Credits, dafuer wandert
// der urheber mit in den Nachweis.
const LIZENZEN = '(license:"Creative Commons 0" OR license:"Attribution")';

export function lizenzKuerzel(lizenz) {
  return /attribution/i.test(lizenz ?? '') ? 'CC-BY' : 'CC0';
}

export function schluesselFehlt() {
  return !process.env.FREESOUND_API_KEY;
}

// Die Vorschau reicht: das Original ist oft 24 Bit und viele Megabyte gross,
// waehrend im Spiel ohnehin eine kurze mp3 landet.
function vorschauVon(treffer) {
  return treffer.previews?.['preview-hq-mp3'] ?? treffer.previews?.['preview-lq-mp3'] ?? null;
}

export async function finde(suche, hoechstens = 2, sekunden = 2) {
  if (schluesselFehlt()) return [];

  const felder = 'id,name,license,previews,url,duration,username';
  const filter = `${LIZENZEN} duration:[0.1 TO ${Math.max(2, sekunden * 8)}]`;
  const adresse = `${SUCHE}?query=${encodeURIComponent(suche)}`
    + `&filter=${encodeURIComponent(filter)}&fields=${felder}&page_size=15&sort=rating_desc`;

  const antwort = await fetch(adresse, {
    headers: { Authorization: `Token ${process.env.FREESOUND_API_KEY}` },
  });
  if (!antwort.ok) throw new Error(`Freesound ${antwort.status}: ${await antwort.text()}`);

  const treffer = (await antwort.json()).results ?? [];
  return treffer
    .filter(vorschauVon)
    .slice(0, hoechstens)
    .map((einer) => ({
      titel: einer.name,
      herkunft: einer.url,
      lizenz: lizenzKuerzel(einer.license),
      urheber: einer.username,
      quelle: NAME,
      url: vorschauVon(einer),
    }));
}
