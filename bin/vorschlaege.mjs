import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as opengameart from '../quellen/opengameart.mjs';
import * as kenney from '../quellen/kenney.mjs';
import * as elevenlabs from '../quellen/elevenlabs.mjs';
import { zerlege, istSammeldatei, raeumeAuf } from '../quellen/zerlegen.mjs';

const NACHWEIS = 'herkunft.json';
const LAENGENFAKTOR = 3;
const MINDESTFENSTER = 2;
const TEILE_JE_SAMMELDATEI = 4;

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

export function naechsteNummer(dateinamen, praefix) {
  const belegt = dateinamen
    .filter((name) => name.startsWith(`${praefix}-`))
    .map((name) => Number(name.slice(praefix.length + 1).split('.')[0]))
    .filter((nummer) => Number.isInteger(nummer) && nummer > 0);
  return belegt.length ? Math.max(...belegt) + 1 : 1;
}

function ablegen(ordner, dateiname, daten, fund) {
  fs.writeFileSync(path.join(ordner, dateiname), daten);
  melde(dateiname, daten, fund.quelle, fund.titel);
  return { datei: dateiname, titel: fund.titel, herkunft: fund.herkunft,
    lizenz: fund.lizenz, quelle: fund.quelle };
}

function dauerVon(pfad) {
  try {
    const ausgabe = execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pfad],
      { encoding: 'utf8' });
    return Number(ausgabe.trim()) || null;
  } catch {
    return null;
  }
}

export function istBrauchbar(dauer, gewuenscht) {
  if (dauer === null) return true;
  return dauer <= Math.max(gewuenscht * LAENGENFAKTOR, MINDESTFENSTER);
}

function nimmSammeldatei(ordner, dateiname, fund, gewuenscht, ab) {
  const pfad = path.join(ordner, dateiname);
  const erlaubt = Math.max(gewuenscht * LAENGENFAKTOR, MINDESTFENSTER);
  const teile = zerlege(pfad, erlaubt, TEILE_JE_SAMMELDATEI);
  raeumeAuf(pfad);

  return teile.map((teil, i) => {
    const name = `cc0-${ab + i}.ogg`;
    fs.renameSync(teil.datei, path.join(ordner, name));
    melde(name, fs.readFileSync(path.join(ordner, name)), fund.quelle, `${fund.titel} (${teil.dauer} s)`);
    return { datei: name, titel: `${fund.titel}, Teil ${i + 1}`, herkunft: fund.herkunft,
      lizenz: fund.lizenz, quelle: fund.quelle };
  });
}

async function sammleCc0(ordner, suche, jeQuelle, sekunden) {
  const vermerkt = [];
  let ab = naechsteNummer(fs.readdirSync(ordner), 'cc0');
  for (const quelle of [opengameart, kenney]) {
    for (const fund of await quelle.finde(suche, jeQuelle)) {
      const daten = fund.pfad ? fs.readFileSync(fund.pfad) : await lade(fund.url);
      if (!daten) continue;
      const endung = path.extname(fund.pfad || fund.url).toLowerCase();
      const dateiname = `cc0-${ab}${endung}`;
      const eintrag = ablegen(ordner, dateiname, daten, fund);
      const dauer = dauerVon(path.join(ordner, dateiname));

      if (istSammeldatei(dauer, sekunden)) {
        console.log(`   ${fund.titel} ist ${dauer.toFixed(1)} s lang, wird an den Stillen zerlegt`);
        const teile = nimmSammeldatei(ordner, dateiname, fund, sekunden, ab);
        vermerkt.push(...teile);
        ab += teile.length;
        continue;
      }

      if (!istBrauchbar(dauer, sekunden)) {
        fs.unlinkSync(path.join(ordner, dateiname));
        console.log(`   verworfen: ${fund.titel} laesst sich nicht in Einzelklaenge trennen`);
        continue;
      }
      vermerkt.push(eintrag);
      ab += 1;
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
  const ab = naechsteNummer(fs.readdirSync(ordner), 'ki');
  for (const [i, wunsch] of wuensche.entries()) {
    const klang = await elevenlabs.erzeuge(wunsch, { sekunden });
    vermerkt.push(ablegen(ordner, `ki-${ab + i}.mp3`, klang.daten, { ...klang, titel: wunsch }));
  }
  return vermerkt;
}

async function sammle() {
  const kennung = process.argv[2];
  const wurzel = argument('ordner');
  const suche = argument('suche');
  const kiWuensche = alleArgumente('ki');
  const sekunden = Number(argument('sekunden', '1.2'));

  if (!kennung || kennung.startsWith('--') || !wurzel) { hilfe(); process.exit(1); }

  const ordner = path.resolve(wurzel, kennung);
  fs.mkdirSync(ordner, { recursive: true });

  const vermerkt = [
    ...(suche ? await sammleCc0(ordner, suche, Number(argument('cc0', '2')), sekunden) : []),
    ...(kiWuensche.length ? await erzeugeKi(ordner, kiWuensche, sekunden) : []),
  ];

  if (!vermerkt.length) { console.log('Keine Kandidaten gefunden.'); return; }
  schreibeNachweis(ordner, vermerkt);
  console.log(`\n${vermerkt.length} Kandidaten in ${ordner}, Herkunft in ${NACHWEIS}`);
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  sammle().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
