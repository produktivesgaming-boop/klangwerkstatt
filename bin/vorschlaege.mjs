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

function melde(dateiname, daten, quelle, titel) {
  console.log(`${dateiname.padEnd(12)}${Math.round(daten.length / 1024)} KB  ${quelle}  ${titel.slice(0, 44)}`);
}

function ablegen(ordner, dateiname, daten, fund) {
  fs.writeFileSync(path.join(ordner, dateiname), daten);
  melde(dateiname, daten, fund.quelle, fund.titel);
  return { datei: dateiname, titel: fund.titel, herkunft: fund.herkunft,
    lizenz: fund.lizenz, quelle: fund.quelle };
}

async function sammleCc0(ordner, suche, jeQuelle) {
  const vermerkt = [];
  for (const quelle of [opengameart, kenney]) {
    for (const fund of await quelle.finde(suche, jeQuelle)) {
      const daten = fund.pfad ? fs.readFileSync(fund.pfad) : await lade(fund.url);
      if (!daten) continue;
      const endung = path.extname(fund.pfad || fund.url).toLowerCase();
      vermerkt.push(ablegen(ordner, `cc0-${vermerkt.length + 1}${endung}`, daten, fund));
    }
  }
  return vermerkt;
}

async function erzeugeKi(ordner, wuensche, sekunden) {
  if (elevenlabs.schluesselFehlt()) {
    console.log('ELEVENLABS_API_KEY fehlt, die erzeugten Vorschlaege entfallen.');
    return [];
  }
  const vermerkt = [];
  for (const [i, wunsch] of wuensche.entries()) {
    const klang = await elevenlabs.erzeuge(wunsch, { sekunden });
    vermerkt.push(ablegen(ordner, `ki-${i + 1}.mp3`, klang.daten, { ...klang, titel: wunsch }));
  }
  return vermerkt;
}

async function sammle() {
  const kennung = process.argv[2];
  const wurzel = argument('ordner');
  const suche = argument('suche');
  const kiWuensche = alleArgumente('ki');

  if (!kennung || kennung.startsWith('--') || !wurzel) { hilfe(); process.exit(1); }

  const ordner = path.resolve(wurzel, kennung);
  fs.mkdirSync(ordner, { recursive: true });

  const vermerkt = [
    ...(suche ? await sammleCc0(ordner, suche, Number(argument('cc0', '2'))) : []),
    ...(kiWuensche.length ? await erzeugeKi(ordner, kiWuensche, Number(argument('sekunden', '1.2'))) : []),
  ];

  if (!vermerkt.length) { console.log('Keine Kandidaten gefunden.'); return; }
  schreibeNachweis(ordner, vermerkt);
  console.log(`\n${vermerkt.length} Kandidaten in ${ordner}, Herkunft in ${NACHWEIS}`);
}

sammle().catch((fehler) => { console.error(fehler.message); process.exit(1); });
