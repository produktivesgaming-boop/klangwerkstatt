/** Schneidet Sammeldateien an den Stillen in einzelne Klaenge.
 *
 * CC0-Pakete liefern oft ein Bündel: "Man hurt sounds" sind acht Laute in einer
 * Datei, Kenney-Previews sogar vierzig. Als Kandidat ist so etwas unbrauchbar,
 * die einzelnen Laute darin sind aber genau das, was gesucht wird. ffmpeg
 * findet die Stillen (silencedetect), daraus werden die Klangstuecke berechnet
 * und einzeln herausgeschnitten.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const RUHEPEGEL = '-38dB';
const RUHEDAUER = 0.12;
const RANDLUFT = 0.04;

export function stueckeAusStillen(stillen, gesamtdauer, mindestens = 0.08) {
  const stuecke = [];
  let anfang = 0;

  for (const stille of stillen) {
    if (stille.start > anfang) stuecke.push({ von: anfang, bis: Math.min(stille.start, gesamtdauer) });
    anfang = stille.ende ?? gesamtdauer;
  }
  if (anfang < gesamtdauer) stuecke.push({ von: anfang, bis: gesamtdauer });

  return stuecke
    .map((stueck) => ({
      von: Math.max(0, stueck.von - RANDLUFT),
      bis: Math.min(gesamtdauer, stueck.bis + RANDLUFT),
    }))
    .filter((stueck) => stueck.bis - stueck.von >= mindestens);
}

export function leseStillen(text) {
  const stillen = [];
  for (const zeile of text.split('\n')) {
    const start = /silence_start:\s*([\d.]+)/.exec(zeile);
    const ende = /silence_end:\s*([\d.]+)/.exec(zeile);
    if (start) stillen.push({ start: Number(start[1]), ende: null });
    if (ende && stillen.length) stillen[stillen.length - 1].ende = Number(ende[1]);
  }
  return stillen;
}

function messe(pfad) {
  const ausgabe = execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pfad],
    { encoding: 'utf8', windowsHide: true });
  return Number(ausgabe.trim()) || 0;
}

function findeStillen(pfad) {
  const lauf = spawnSync('ffmpeg', ['-i', pfad, '-af', `silencedetect=noise=${RUHEPEGEL}:d=${RUHEDAUER}`,
    '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true });
  return leseStillen(String(lauf.stderr ?? ''));
}

function schneide(quelle, ziel, stueck) {
  execFileSync('ffmpeg', ['-y', '-ss', String(stueck.von), '-to', String(stueck.bis), '-i', quelle,
    '-ar', '44100', '-b:a', '128k', ziel], { stdio: 'ignore', windowsHide: true });
}

export function zerlege(pfad, hoechstdauer, hoechstens) {
  const gesamtdauer = messe(pfad);
  if (!gesamtdauer) return [];

  const stuecke = stueckeAusStillen(findeStillen(pfad), gesamtdauer)
    .filter((stueck) => stueck.bis - stueck.von <= hoechstdauer);
  if (!stuecke.length) return [];

  const ordner = path.dirname(pfad);
  const genommen = stuecke.slice(0, hoechstens);
  const geschnitten = genommen.map((stueck, i) => {
    const ziel = path.join(ordner, `teil-${i + 1}.ogg`);
    schneide(pfad, ziel, stueck);
    return { datei: ziel, dauer: Number((stueck.bis - stueck.von).toFixed(2)) };
  });

  if (stuecke.length > genommen.length) {
    console.log(`   ${stuecke.length} Einzelklaenge gefunden, die ersten ${genommen.length} genommen`);
  }
  return geschnitten;
}

export function istSammeldatei(dauer, gewuenscht) {
  return dauer !== null && dauer > gewuenscht * 3;
}

export function raeumeAuf(pfad) {
  if (fs.existsSync(pfad)) fs.unlinkSync(pfad);
}
