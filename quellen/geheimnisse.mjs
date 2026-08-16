/** Holt Zugangsschluessel aus Life-OS/.secrets/credentials.env.
 *
 * Gefunden wird die Datei durch Hochlaufen vom Arbeitsverzeichnis, so wie es
 * alle Life-OS-Werkzeuge tun; eine Kopie je Projekt gibt es bewusst nicht.
 * Bereits gesetzte Umgebungsvariablen bleiben unangetastet.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATEI = path.join('.secrets', 'credentials.env');
// Nicht jedes Projekt liegt UNTER Life-OS: Horde und Gruenspiel stehen daneben.
// Auf jeder Ebene wird deshalb auch im Life-OS-Ordner nachgesehen.
const NACHBARN = ['.', 'Life-OS'];

export function findeDatei(start = process.cwd()) {
  let ordner = path.resolve(start);
  for (;;) {
    for (const nachbar of NACHBARN) {
      const versuch = path.join(ordner, nachbar, DATEI);
      if (fs.existsSync(versuch)) return versuch;
    }
    const darueber = path.dirname(ordner);
    if (darueber === ordner) return null;
    ordner = darueber;
  }
}

export function zeilenZuWerten(text) {
  const werte = {};
  for (const zeile of text.split(/\r?\n/)) {
    const treffer = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(zeile);
    if (!treffer || zeile.trimStart().startsWith('#')) continue;
    werte[treffer[1]] = treffer[2].trim().replace(/^["']|["']$/g, '');
  }
  return werte;
}

export function ladeGeheimnisse(start = process.cwd()) {
  const pfad = findeDatei(start);
  if (!pfad) return {};
  const werte = zeilenZuWerten(fs.readFileSync(pfad, 'utf8'));
  for (const [name, wert] of Object.entries(werte)) {
    if (process.env[name] === undefined) process.env[name] = wert;
  }
  return werte;
}
