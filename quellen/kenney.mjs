import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

export const NAME = 'Kenney (CC0)';

export const KLANGPAKETE = [
  'impact-sounds', 'interface-sounds', 'ui-audio', 'digital-audio',
  'sci-fi-sounds', 'music-jingles', 'rpg-audio', 'casino-audio', 'voiceover-pack',
];

const LAGER = path.join(os.homedir(), '.klangwerkstatt', 'kenney');
const KLANGENDUNGEN = /\.(ogg|wav|mp3)$/i;

// Kenney schreibt sein HTML mit EINFACHEN Anfuehrungszeichen. Ein Muster auf
// href="..." findet den Paketlink nicht und laesst die Seite leer aussehen.
const ZIP_IM_HTML = /https:\/\/kenney\.nl\/media\/pages\/assets\/[^'" ]*\.zip/;

async function zipAdresse(paket) {
  const antwort = await fetch(`https://kenney.nl/assets/${paket}`, {
    headers: { 'User-Agent': 'klangwerkstatt' },
  });
  if (!antwort.ok) return null;
  return (await antwort.text()).match(ZIP_IM_HTML)?.[0] || null;
}

function entpackt(paket) {
  return path.join(LAGER, paket);
}

async function holePaket(paket) {
  const ordner = entpackt(paket);
  if (fs.existsSync(ordner)) return ordner;

  const adresse = await zipAdresse(paket);
  if (!adresse) return null;

  fs.mkdirSync(LAGER, { recursive: true });
  const archiv = path.join(LAGER, `${paket}.zip`);
  const antwort = await fetch(adresse, { headers: { 'User-Agent': 'klangwerkstatt' } });
  if (!antwort.ok) return null;
  fs.writeFileSync(archiv, Buffer.from(await antwort.arrayBuffer()));

  fs.mkdirSync(ordner, { recursive: true });
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `Expand-Archive -Path '${archiv}' -DestinationPath '${ordner}' -Force`], { stdio: 'ignore' });
  } catch {
    fs.rmSync(ordner, { recursive: true, force: true });
    return null;
  }
  fs.unlinkSync(archiv);
  return ordner;
}

function klangdateien(ordner) {
  const gefunden = [];
  const durchsuche = (verzeichnis) => {
    for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
      const voll = path.join(verzeichnis, eintrag.name);
      if (eintrag.isDirectory()) durchsuche(voll);
      else if (KLANGENDUNGEN.test(eintrag.name)) gefunden.push(voll);
    }
  };
  durchsuche(ordner);
  return gefunden;
}

function passung(dateiname, woerter) {
  const name = path.basename(dateiname).toLowerCase();
  return woerter.filter((wort) => name.includes(wort)).length;
}

export async function finde(stichwort, hoechstens = 3) {
  const woerter = stichwort.toLowerCase().split(/\s+/).filter(Boolean);
  const treffer = [];

  for (const paket of KLANGPAKETE) {
    const ordner = await holePaket(paket);
    if (!ordner) continue;
    for (const datei of klangdateien(ordner)) {
      const punkte = passung(datei, woerter);
      if (punkte > 0) treffer.push({ datei, punkte, paket });
    }
  }

  return treffer
    .sort((a, b) => b.punkte - a.punkte || a.datei.length - b.datei.length)
    .slice(0, hoechstens)
    .map((eintrag) => ({
      titel: path.basename(eintrag.datei),
      herkunft: `https://kenney.nl/assets/${eintrag.paket}`,
      lizenz: 'CC0',
      quelle: NAME,
      pfad: eintrag.datei,
    }));
}
