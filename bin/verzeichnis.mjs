import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NACHWEIS = 'herkunft.json';
export const KLANGENDUNGEN = /\.(ogg|wav|mp3|flac)$/i;

function hilfe() {
  console.log(`Klangwerkstatt -- gesammelte Vorschlaege als Verzeichnis ausgeben

  node bin/verzeichnis.mjs --ordner <pfad> [--netzpfad <praefix>]

  --ordner    Wurzel der Vorschlagsordner (z. B. public/audio/vorschlaege)
  --netzpfad  Praefix fuer die Adresse im Browser (z. B. /audio/vorschlaege)

Ausgabe ist JSON auf der Standardausgabe: je Kennung die Kandidaten mit
Adresse, Titel, Herkunft, Lizenz und Quelle aus ${NACHWEIS}.`);
}

function argument(name, standard = null) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : standard;
}

function nachweis(ordner) {
  const pfad = path.join(ordner, NACHWEIS);
  if (!fs.existsSync(pfad)) return {};
  const eintraege = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  return Object.fromEntries(eintraege.map((eintrag) => [eintrag.datei, eintrag]));
}

function kandidaten(ordner, netzpfad, kennung) {
  const belegt = nachweis(ordner);
  return fs.readdirSync(ordner)
    .filter((datei) => KLANGENDUNGEN.test(datei))
    .sort()
    .map((datei) => ({
      datei,
      adresse: `${netzpfad}/${kennung}/${datei}`,
      titel: belegt[datei]?.titel || datei,
      herkunft: belegt[datei]?.herkunft || '',
      lizenz: belegt[datei]?.lizenz || 'unbekannt',
      quelle: belegt[datei]?.quelle || 'unbekannt',
    }));
}

function verzeichnis(wurzel, netzpfad) {
  if (!fs.existsSync(wurzel)) return [];
  return fs.readdirSync(wurzel, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory())
    .map((eintrag) => ({
      kennung: eintrag.name,
      kandidaten: kandidaten(path.join(wurzel, eintrag.name), netzpfad, eintrag.name),
    }))
    .filter((eintrag) => eintrag.kandidaten.length);
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  const wurzel = argument('ordner');
  if (!wurzel) { hilfe(); process.exit(1); }
  const netzpfad = (argument('netzpfad', '') || '').replace(/\/$/, '');
  console.log(JSON.stringify(verzeichnis(wurzel, netzpfad), null, 2));
}
