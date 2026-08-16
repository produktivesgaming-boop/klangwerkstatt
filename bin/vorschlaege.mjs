import crypto from 'node:crypto';
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

export function pruefsumme(daten) {
  return crypto.createHash('sha1').update(daten).digest('hex');
}

// Dieselbe Aufnahme taucht in beiden Quellen auf, und ein Fund landet auch mal
// zweimal in derselben Trefferliste. Ohne diesen Vergleich stehen zwei Knoepfe
// nebeneinander, die gleich klingen (Jonas, 16.08.2026).
export function schonVorhanden(neueDaten, bestand) {
  const neu = pruefsumme(neueDaten);
  return bestand.find(({ daten }) => pruefsumme(daten) === neu)?.datei ?? null;
}

function bestandVon(ordner) {
  return fs.readdirSync(ordner)
    .filter((datei) => datei !== NACHWEIS)
    .map((datei) => ({ datei, daten: fs.readFileSync(path.join(ordner, datei)) }));
}

// Der Nachweis wird SOFORT je Datei fortgeschrieben, nicht erst am Ende des
// Laufs: bricht eine Quelle mittendrin ab, laegen sonst Dateien ohne Lizenz im
// Ordner und waeren nicht mehr zuzuordnen.
function ablegen(ordner, dateiname, daten, fund) {
  const gleiche = schonVorhanden(daten, bestandVon(ordner));
  if (gleiche) {
    console.log(`   uebersprungen: ${fund.titel} ist Wort fuer Wort ${gleiche}`);
    return null;
  }
  fs.writeFileSync(path.join(ordner, dateiname), daten);
  melde(dateiname, daten, fund.quelle, fund.titel);
  const eintrag = { datei: dateiname, titel: fund.titel, herkunft: fund.herkunft,
    lizenz: fund.lizenz, quelle: fund.quelle };
  schreibeNachweis(ordner, [eintrag]);
  return eintrag;
}

function loesche(ordner, dateiname) {
  const pfadDerDatei = path.join(ordner, dateiname);
  if (fs.existsSync(pfadDerDatei)) fs.unlinkSync(pfadDerDatei);
  const pfad = path.join(ordner, NACHWEIS);
  if (!fs.existsSync(pfad)) return;
  const bisher = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  fs.writeFileSync(pfad, JSON.stringify(bisher.filter((eintrag) => eintrag.datei !== dateiname), null, 2), 'utf8');
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
  loesche(ordner, dateiname);

  // Erst ALLE Teile einlesen und ihre Zwischendateien wegraeumen, dann ablegen:
  // die Zwischendateien liegen im selben Ordner, und ablegen prueft gegen den
  // Ordnerinhalt. Sonst hielte es jeden Teil fuer eine Dublette seiner selbst,
  // und kein einziger Teil einer Sammeldatei kaeme je an.
  const inhalte = teile.map((teil) => fs.readFileSync(teil.datei));
  for (const teil of teile) fs.unlinkSync(teil.datei);

  return inhalte.map((daten, i) => ablegen(ordner, `cc0-${ab + i}.ogg`, daten,
    { ...fund, titel: `${fund.titel}, Teil ${i + 1}` })).filter(Boolean);
}

async function sammleCc0(ordner, suche, jeQuelle, sekunden) {
  const vermerkt = [];
  let ab = naechsteNummer(fs.readdirSync(ordner), 'cc0');
  for (const quelle of [opengameart, kenney]) {
    for (const fund of await quelle.finde(suche, jeQuelle)) {
      // Beim Zerlegen codiert ffmpeg neu, die Teile sind also nie bitgleich mit
      // denen eines frueheren Laufs. Deshalb entscheidet hier der Titel, sonst
      // sammelt sich dieselbe Aufnahme bei jedem Lauf ein weiteres Mal an.
      if (schonGeholt(ordner, fund.titel)) {
        console.log(`   schon vorhanden, uebersprungen: ${fund.titel}`);
        continue;
      }
      const daten = fund.pfad ? fs.readFileSync(fund.pfad) : await lade(fund.url);
      if (!daten) continue;
      const endung = path.extname(fund.pfad || fund.url).toLowerCase();
      const dateiname = `cc0-${ab}${endung}`;
      const eintrag = ablegen(ordner, dateiname, daten, fund);
      if (!eintrag) continue;
      const dauer = dauerVon(path.join(ordner, dateiname));

      if (istSammeldatei(dauer, sekunden)) {
        console.log(`   ${fund.titel} ist ${dauer.toFixed(1)} s lang, wird an den Stillen zerlegt`);
        const teile = nimmSammeldatei(ordner, dateiname, fund, sekunden, ab);
        vermerkt.push(...teile);
        ab += teile.length;
        continue;
      }

      if (!istBrauchbar(dauer, sekunden)) {
        loesche(ordner, dateiname);
        console.log(`   verworfen: ${fund.titel} laesst sich nicht in Einzelklaenge trennen`);
        continue;
      }
      vermerkt.push(eintrag);
      ab += 1;
    }
  }
  return vermerkt;
}

export function schonGeholt(ordner, titel) {
  const pfad = path.join(ordner, NACHWEIS);
  if (!fs.existsSync(pfad)) return false;
  return JSON.parse(fs.readFileSync(pfad, 'utf8'))
    .some((eintrag) => eintrag.titel === titel || eintrag.titel.startsWith(`${titel}, Teil `));
}

export function schonBestellt(ordner, wunsch) {
  const pfad = path.join(ordner, NACHWEIS);
  if (!fs.existsSync(pfad)) return false;
  return JSON.parse(fs.readFileSync(pfad, 'utf8')).some((eintrag) => eintrag.titel === wunsch);
}

async function erzeugeKi(ordner, wuensche, sekunden) {
  if (elevenlabs.schluesselFehlt()) {
    console.log('ELEVENLABS_API_KEY fehlt, die erzeugten Vorschlaege entfallen.');
    return [];
  }
  // Ein Wunsch, zu dem schon ein Stueck im Nachweis steht, wird NICHT erneut
  // bestellt: sonst kostet jeder weitere Lauf denselben Auftrag noch einmal Geld
  // und legt eine weitere Fassung desselben Klangs daneben.
  const vermerkt = [];
  const offen = wuensche.filter((wunsch) => !schonBestellt(ordner, wunsch));
  const ab = naechsteNummer(fs.readdirSync(ordner), 'ki');
  for (const [i, wunsch] of offen.entries()) {
    const klang = await elevenlabs.erzeuge(wunsch, { sekunden });
    const eintrag = ablegen(ordner, `ki-${ab + i}.mp3`, klang.daten, { ...klang, titel: wunsch });
    if (eintrag) vermerkt.push(eintrag);
  }
  for (const wunsch of wuensche.filter((einer) => schonBestellt(ordner, einer))) {
    console.log(`   schon bestellt, uebersprungen: ${wunsch.slice(0, 50)}`);
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
  console.log(`\n${vermerkt.length} Kandidaten in ${ordner}, Herkunft in ${NACHWEIS}`);
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  sammle().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
