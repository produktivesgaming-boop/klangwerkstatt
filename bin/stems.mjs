import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ladeGeheimnisse } from '../quellen/geheimnisse.mjs';

ladeGeheimnisse();

const ENDPUNKT = 'https://api.elevenlabs.io/v1/music/stem-separation';

function hilfe() {
  console.log(`Klangwerkstatt -- ein Stueck in Schichten (Stems) zerlegen

  node bin/stems.mjs <datei> --ordner <zielordner> [--variante six_stems_v1]

Die Schnittstelle liefert ein ZIP mit einer Datei je Schicht; ausgepackt wird
mit unzip (in der Git Bash und auf Linux vorhanden; tar meldet bei diesem ZIP faelschlich ein fremdes Format). Die Dateien behalten die Namen
der Schnittstelle (bass, drums, guitar, piano, vocals, other).`);
}

function argument(name, standard = null) {
  const stelle = process.argv.indexOf(`--${name}`);
  return stelle > 0 ? process.argv[stelle + 1] : standard;
}

export async function trenne(datei, variante) {
  const schluessel = process.env.ELEVENLABS_API_KEY;
  if (!schluessel) throw new Error('ELEVENLABS_API_KEY ist nicht gesetzt.');

  const formular = new FormData();
  formular.append('file', new Blob([fs.readFileSync(datei)], { type: 'audio/mpeg' }),
    path.basename(datei));
  formular.append('stem_variation_id', variante);

  const antwort = await fetch(`${ENDPUNKT}?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': schluessel }, body: formular,
  });
  if (!antwort.ok) throw new Error(`${antwort.status} ${await antwort.text()}`);
  return Buffer.from(await antwort.arrayBuffer());
}

async function zerlege() {
  const datei = process.argv[2];
  const ordner = argument('ordner');
  const variante = argument('variante', 'six_stems_v1');
  if (!datei || datei.startsWith('--') || !ordner) { hilfe(); process.exit(1); }

  fs.mkdirSync(ordner, { recursive: true });
  const zip = path.join(ordner, 'stems.zip');
  fs.writeFileSync(zip, await trenne(datei, variante));
  execFileSync('unzip', ['-o', path.basename(zip)], { cwd: ordner });
  fs.rmSync(zip);
  for (const name of fs.readdirSync(ordner)) {
    console.log(`${name}  ${Math.round(fs.statSync(path.join(ordner, name)).size / 1024)} KB`);
  }
}

const alsBefehlGestartet = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (alsBefehlGestartet) {
  zerlege().catch((fehler) => { console.error(fehler.message); process.exit(1); });
}
