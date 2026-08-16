import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as elevenlabs from '../quellen/elevenlabs.mjs';
import { ladeGeheimnisse } from '../quellen/geheimnisse.mjs';

ladeGeheimnisse();

const NACHWEIS = 'herkunft.json';

function hilfe() {
  console.log(`Klangwerkstatt -- Musikstuecke erzeugen

  node bin/musik.mjs <szene> --ordner <pfad> --stimmung "<beschreibung>" ...
                     [--sekunden 45]

  <szene>      Unterordner, z. B. "kampf"
  --ordner     Wohin die Stuecke gehoeren (z. B. public/assets/musik)
  --stimmung   Beschreibung fuer das Musikmodell, MEHRFACH angebbar
  --sekunden   Laenge, Standard 45

Je Stimmung entsteht ein Kandidat <szene>/ki-<n>.mp3, genau wie bei den Klaengen:
gehoert wird in der Klangvorschau, gewaehlt wird von Hand. Die Stuecke sollen
SCHLEIFENFAEHIG sein, deshalb gehoert "seamless loop" in jede Stimmung.`);
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

// Aus Szene und Nummer statt aus dem Zufall: derselbe Auftrag ergibt denselben
// seed, und die Zahl steht im Nachweis, statt nur im Kopf des Modells.
export function saatFuer(szene, nummer) {
  let wert = 0;
  for (const zeichen of `${szene}-${nummer}`) wert = (wert * 31 + zeichen.charCodeAt(0)) % 2147483647;
  return wert;
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

async function erzeuge() {
  const szene = process.argv[2];
  const wurzel = argument('ordner');
  const stimmungen = alleArgumente('stimmung');
  const sekunden = Number(argument('sekunden', '45'));

  if (!szene || szene.startsWith('--') || !wurzel || !stimmungen.length) { hilfe(); process.exit(1); }
  if (elevenlabs.schluesselFehlt()) {
    console.error('ELEVENLABS_API_KEY fehlt.');
    process.exit(1);
  }

  const ordner = path.resolve(wurzel, szene);
  fs.mkdirSync(ordner, { recursive: true });
  const ab = naechsteNummer(ordner);

  // Der seed wird HIER vergeben und im Nachweis festgehalten: die Musik taucht
  // in keiner History auf, ohne ihn ist ein Stueck spaeter nicht nachbestellbar.
  for (const [i, stimmung] of stimmungen.entries()) {
    const seed = saatFuer(szene, ab + i);
    const daten = await elevenlabs.komponiere(stimmung, sekunden, { seed });
    const datei = `ki-${ab + i}.mp3`;
    fs.writeFileSync(path.join(ordner, datei), daten);
    schreibeNachweis(ordner, {
      datei, titel: stimmung, herkunft: 'https://elevenlabs.io',
      lizenz: 'KI-generiert', quelle: 'ElevenLabs (KI-generiert)', seed,
    });
    console.log(`${szene}/${datei}  ${Math.round(daten.length / 1024)} KB  ${sekunden} s  seed ${seed}`);
  }
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  erzeuge().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
