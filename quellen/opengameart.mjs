const SUCHE = 'https://opengameart.org/art-search-advanced';
const NUR_KLANG = 'field_art_type_tid%5B%5D=13';
const NUR_CC0 = 'field_art_licenses_tid%5B%5D=4';
const KLANGENDUNGEN = /\.(wav|ogg|mp3|flac)$/i;

export const NAME = 'OpenGameArt (CC0)';

async function seite(adresse) {
  const antwort = await fetch(adresse, { headers: { 'User-Agent': 'klangwerkstatt' } });
  if (!antwort.ok) throw new Error(`${antwort.status} bei ${adresse}`);
  return antwort.text();
}

// Die Suche ist streng UND-verknuepft: "smoke impact" findet nichts, obwohl es
// zu beiden Woertern Treffer gibt. Deshalb Wort fuer Wort und dann zusammenlegen.
async function trefferZuWort(wort) {
  const text = await seite(`${SUCHE}?keys=${encodeURIComponent(wort)}&${NUR_KLANG}&${NUR_CC0}`);
  return [...text.matchAll(/href="(\/content\/[^"?#]+)"/g)]
    .map((treffer) => treffer[1])
    .filter((pfad) => pfad !== '/content/faq');
}

async function werkVon(pfad) {
  const text = await seite(`https://opengameart.org${pfad}`);
  const dateien = [...text.matchAll(/href="(https:\/\/opengameart\.org\/sites\/default\/files\/[^"]+)"/g)]
    .map((treffer) => treffer[1])
    .filter((url) => KLANGENDUNGEN.test(url));
  return {
    titel: (text.match(/<title>([^<]+)</) || [])[1]?.replace(/\s*\|.*$/, '').trim() || pfad,
    seite: `https://opengameart.org${pfad}`,
    istCc0: /CC0/i.test(text),
    dateien: [...new Set(dateien)],
  };
}

export async function finde(stichwort, hoechstens = 3) {
  const pfade = [];
  for (const wort of stichwort.split(/\s+/).filter(Boolean)) {
    for (const pfad of await trefferZuWort(wort)) {
      if (!pfade.includes(pfad)) pfade.push(pfad);
    }
  }

  const gefunden = [];
  for (const pfad of pfade.slice(0, 12)) {
    const werk = await werkVon(pfad);
    if (!werk.istCc0 || !werk.dateien.length) continue;
    gefunden.push({
      titel: werk.titel,
      herkunft: werk.seite,
      lizenz: 'CC0',
      quelle: NAME,
      url: werk.dateien[0],
    });
    if (gefunden.length >= hoechstens) break;
  }
  return gefunden;
}
