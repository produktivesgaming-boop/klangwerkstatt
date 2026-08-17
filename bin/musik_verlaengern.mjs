import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as elevenlabs from '../quellen/elevenlabs.mjs';
import { ladeGeheimnisse } from '../quellen/geheimnisse.mjs';
import { ladeHoch, planMitBezug } from '../quellen/musikbezug.mjs';

ladeGeheimnisse();

const NACHWEIS = 'herkunft.json';

function hilfe() {
  console.log(`Klangwerkstatt -- ein vorhandenes Stueck VERLAENGERN

  node bin/musik_verlaengern.mjs <szene> --ordner <pfad> --vorlage <datei>
                                 --fortsetzung "<stile>" [--sekunden 30]

  <szene>        Unterordner, z. B. "kampf"
  --ordner       Wohin die Stuecke gehoeren (z. B. public/assets/musik)
  --vorlage      Vorhandene Datei, die vorn UNVERAENDERT stehen bleibt
  --fortsetzung  Stilworte fuer den angehaengten Teil, MEHRFACH angebbar
                 (je Angabe entsteht ein eigener Kandidat)
  --sekunden     Laenge des angehaengten Teils, Standard 30

Der angehaengte Teil wird in zwei Abschnitte geteilt: eine Steigerung und eine
Rueckfuehrung zum Anfang, damit das laengere Stueck weiter sauber loopt.`);
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

export function dauerMsVon(datei) {
  const ausgabe = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', datei,
  ], { encoding: 'utf8' });
  return Math.round(Number(ausgabe.trim()) * 1000);
}

function naechsteNummer(ordner) {
  if (!fs.existsSync(ordner)) return 1;
  const nummern = fs.readdirSync(ordner)
    .filter((datei) => datei.startsWith('ki-'))
    .map((datei) => Number(datei.slice(3).split('.')[0]))
    .filter((nummer) => Number.isFinite(nummer));
  return nummern.length ? Math.max(...nummern) + 1 : 1;
}

function schreibeNachweis(ordner, eintrag) {
  const pfad = path.join(ordner, NACHWEIS);
  const bisher = fs.existsSync(pfad) ? JSON.parse(fs.readFileSync(pfad, 'utf8')) : [];
  const neu = [...bisher.filter((alt) => alt.datei !== eintrag.datei), eintrag];
  fs.writeFileSync(pfad, JSON.stringify(neu, null, 2), 'utf8');
}

// Zwei Abschnitte statt einem: der erste darf steigern, der zweite MUSS
// zurueckfuehren. Ein einzelner langer Abschnitt endet sonst irgendwo.
function fortsetzungsabschnitte(stile, sekunden) {
  const worte = stile.split(',').map((teil) => teil.trim()).filter(Boolean);
  return [
    { name: 'Build', dauerMs: Math.round(sekunden * 1000 * 0.6), stile: [...worte, 'same instruments and tempo as before, raising the intensity'] },
    { name: 'Turnaround', dauerMs: Math.round(sekunden * 1000 * 0.4), stile: [...worte, 'winding back to the opening theme, no fade out, no ending'] },
  ];
}

async function verlaengere() {
  const szene = process.argv[2];
  const wurzel = argument('ordner');
  const vorlage = argument('vorlage');
  const fortsetzungen = alleArgumente('fortsetzung');
  const sekunden = Number(argument('sekunden', '30'));

  if (!szene || szene.startsWith('--') || !wurzel || !vorlage || !fortsetzungen.length) {
    hilfe(); process.exit(1);
  }
  if (elevenlabs.schluesselFehlt()) { console.error('ELEVENLABS_API_KEY fehlt.'); process.exit(1); }

  const ordner = path.resolve(wurzel, szene);
  fs.mkdirSync(ordner, { recursive: true });

  const dauerMs = dauerMsVon(vorlage);
  const hochgeladen = await ladeHoch(fs.readFileSync(vorlage), path.basename(vorlage));
  console.log(`Vorlage ${path.basename(vorlage)}  ${(dauerMs / 1000).toFixed(1)} s  song_id ${hochgeladen.song_id}`);

  const ab = naechsteNummer(ordner);
  for (const [i, stile] of fortsetzungen.entries()) {
    const nummer = ab + i;
    const plan = planMitBezug(hochgeladen.song_id, dauerMs, fortsetzungsabschnitte(stile, sekunden));
    const daten = await elevenlabs.komponiere(plan);
    const datei = `ki-${nummer}.mp3`;
    fs.writeFileSync(path.join(ordner, datei), daten);
    schreibeNachweis(ordner, {
      datei,
      titel: `${path.basename(vorlage)} verlaengert: ${stile}`,
      herkunft: 'https://elevenlabs.io',
      lizenz: 'KI-generiert',
      quelle: 'ElevenLabs (KI-generiert)',
      vorlage: path.basename(vorlage),
      songId: hochgeladen.song_id,
    });
    console.log(`${szene}/${datei}  ${Math.round(daten.length / 1024)} KB  `
      + `${(dauerMs / 1000 + sekunden).toFixed(0)} s erwartet`);
  }
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  verlaengere().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
