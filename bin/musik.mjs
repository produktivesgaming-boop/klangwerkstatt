import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as elevenlabs from '../quellen/elevenlabs.mjs';

const NACHWEIS = 'herkunft.json';

function hilfe() {
  console.log(`Klangwerkstatt -- Musikstuecke erzeugen

  node bin/musik.mjs <name> --ordner <pfad> --stimmung "<beschreibung>"
                     [--sekunden 45]

  <name>       Dateiname ohne Endung, z. B. "kampf"
  --ordner     Wohin das Stueck gehoert (z. B. public/assets/musik)
  --stimmung   Beschreibung fuer das Musikmodell
  --sekunden   Laenge, Standard 45

Anders als bin/vorschlaege.mjs erzeugt das hier GENAU EIN Stueck: Musik dauert
lange und kostet entsprechend, eine Viererauswahl waere Verschwendung. Das Stueck
soll SCHLEIFENFAEHIG sein, deshalb gehoert "seamless loop" in die Stimmung.`);
}

function argument(name, standard = null) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : standard;
}

function schreibeNachweis(ordner, eintrag) {
  const pfad = path.join(ordner, NACHWEIS);
  const bisher = fs.existsSync(pfad) ? JSON.parse(fs.readFileSync(pfad, 'utf8')) : [];
  const neu = [...bisher.filter((alt) => alt.datei !== eintrag.datei), eintrag];
  fs.writeFileSync(pfad, JSON.stringify(neu, null, 2), 'utf8');
}

async function erzeuge() {
  const name = process.argv[2];
  const ordner = argument('ordner');
  const stimmung = argument('stimmung');
  const sekunden = Number(argument('sekunden', '45'));

  if (!name || name.startsWith('--') || !ordner || !stimmung) { hilfe(); process.exit(1); }
  if (elevenlabs.schluesselFehlt()) {
    console.error('ELEVENLABS_API_KEY fehlt.');
    process.exit(1);
  }

  fs.mkdirSync(ordner, { recursive: true });
  const daten = await elevenlabs.komponiere(stimmung, sekunden);
  const datei = `${name}.mp3`;
  fs.writeFileSync(path.join(ordner, datei), daten);

  schreibeNachweis(ordner, {
    datei, titel: stimmung, herkunft: 'https://elevenlabs.io',
    lizenz: 'KI-generiert', quelle: 'ElevenLabs (KI-generiert)',
  });
  console.log(`${datei}  ${Math.round(daten.length / 1024)} KB  ${sekunden} s`);
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  erzeuge().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
