import fs from 'node:fs';
import path from 'node:path';
import * as opengameart from '../quellen/opengameart.mjs';
import * as kenney from '../quellen/kenney.mjs';
import * as elevenlabs from '../quellen/elevenlabs.mjs';

const NACHWEIS = 'herkunft.json';

function hilfe() {
  console.log(`Klangwerkstatt -- Kandidaten fuer einen Klang sammeln

  node bin/vorschlaege.mjs <kennung> --ordner <pfad> --suche "<stichworte>"
                           [--ki "<beschreibung>" ...] [--cc0 2] [--sekunden 1.2]

  <kennung>      Name des Klangs, wird zum Unterordner
  --ordner       Wohin die Vorschlaege gehoeren (z. B. public/audio/vorschlaege)
  --suche        Stichworte fuer OpenGameArt und Kenney
  --ki           Beschreibung fuer ElevenLabs, mehrfach angebbar
  --cc0          Wie viele CC0-Kandidaten je Quelle (Standard 2)
  --sekunden     Laenge der erzeugten Klaenge (Standard 1.2)

Jede Datei wird in ${NACHWEIS} mit Titel, Herkunft und Lizenz vermerkt.`);
}

function argument(name, standard = null) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : standard;
}

function alleArgumente(name) {
  const werte = [];
  process.argv.forEach((wert, i) => {
    if (wert === `--${name}` && process.argv[i + 1]) werte.push(process.argv[i + 1]);
  });
  return werte;
}

async function lade(url) {
  const antwort = await fetch(url, { headers: { 'User-Agent': 'klangwerkstatt' } });
  if (!antwort.ok) return null;
  return Buffer.from(await antwort.arrayBuffer());
}

function schreibeNachweis(ordner, eintraege) {
  const pfad = path.join(ordner, NACHWEIS);
  const bisher = fs.existsSync(pfad) ? JSON.parse(fs.readFileSync(pfad, 'utf8')) : [];
  const neu = [...bisher.filter((alt) => !eintraege.some((e) => e.datei === alt.datei)), ...eintraege];
  fs.writeFileSync(pfad, JSON.stringify(neu, null, 2), 'utf8');
}

async function sammle() {
  const kennung = process.argv[2];
  const wurzel = argument('ordner');
  const suche = argument('suche');
  const kiWuensche = alleArgumente('ki');
  const jeQuelle = Number(argument('cc0', '2'));
  const sekunden = Number(argument('sekunden', '1.2'));

  if (!kennung || kennung.startsWith('--') || !wurzel) { hilfe(); process.exit(1); }

  const ordner = path.resolve(wurzel, kennung);
  fs.mkdirSync(ordner, { recursive: true });
  const vermerkt = [];
  let cc0Nummer = 0;

  if (suche) {
    for (const quelle of [opengameart, kenney]) {
      const treffer = await quelle.finde(suche, jeQuelle);
      for (const fund of treffer) {
        const endung = path.extname(fund.pfad || fund.url).toLowerCase();
        cc0Nummer += 1;
        const dateiname = `cc0-${cc0Nummer}${endung}`;
        const daten = fund.pfad ? fs.readFileSync(fund.pfad) : await lade(fund.url);
        if (!daten) { cc0Nummer -= 1; continue; }
        fs.writeFileSync(path.join(ordner, dateiname), daten);
        vermerkt.push({ datei: dateiname, titel: fund.titel, herkunft: fund.herkunft,
          lizenz: fund.lizenz, quelle: fund.quelle });
        console.log(`${dateiname.padEnd(12)}${Math.round(daten.length / 1024)} KB  ${fund.quelle}  ${fund.titel}`);
      }
    }
  }

  if (kiWuensche.length && elevenlabs.schluesselFehlt()) {
    console.log('ELEVENLABS_API_KEY fehlt, die erzeugten Vorschlaege entfallen.');
  } else {
    for (const [i, wunsch] of kiWuensche.entries()) {
      const klang = await elevenlabs.erzeuge(wunsch, { sekunden });
      const dateiname = `ki-${i + 1}.mp3`;
      fs.writeFileSync(path.join(ordner, dateiname), klang.daten);
      vermerkt.push({ datei: dateiname, titel: wunsch, herkunft: klang.herkunft,
        lizenz: klang.lizenz, quelle: klang.quelle });
      console.log(`${dateiname.padEnd(12)}${Math.round(klang.daten.length / 1024)} KB  ${klang.quelle}  ${wunsch.slice(0, 44)}`);
    }
  }

  if (!vermerkt.length) { console.log('Keine Kandidaten gefunden.'); return; }
  schreibeNachweis(ordner, vermerkt);
  console.log(`\n${vermerkt.length} Kandidaten in ${ordner}, Herkunft in ${NACHWEIS}`);
}

sammle().catch((fehler) => { console.error(fehler.message); process.exit(1); });
