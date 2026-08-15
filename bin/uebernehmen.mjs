import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PEGELZIEL = 'loudnorm=I=-18:TP=-2:LRA=11';

function hilfe() {
  console.log(`Klangwerkstatt -- einen Kandidaten als fertigen Klang uebernehmen

  node bin/uebernehmen.mjs --quelle <kandidatendatei> --ziel <zieldatei>

  --quelle  Pfad zum ausgewaehlten Vorschlag (wav, ogg oder mp3)
  --ziel    Pfad der fertigen Klangdatei im Projekt

Der Kandidat wird auf einen einheitlichen Pegel gebracht und ins Format der
Zieldatei gewandelt. Klaenge aus CC0-Paketen sind sonst deutlich lauter oder
leiser als erzeugte.`);
}

function argument(name) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : null;
}

const quelle = argument('quelle');
const ziel = argument('ziel');
if (!quelle || !ziel) { hilfe(); process.exit(1); }
if (!fs.existsSync(quelle)) { console.error(`${quelle} gibt es nicht.`); process.exit(1); }

fs.mkdirSync(path.dirname(ziel), { recursive: true });
try {
  execFileSync('ffmpeg', ['-y', '-i', quelle, '-af', PEGELZIEL, '-ar', '44100', '-b:a', '128k', ziel],
    { stdio: 'ignore', windowsHide: true });
} catch {
  console.error('ffmpeg konnte den Klang nicht wandeln. Steht ffmpeg im PATH?');
  process.exit(1);
}

console.log(`${path.basename(quelle)} -> ${ziel} (${Math.round(fs.statSync(ziel).size / 1024)} KB)`);
