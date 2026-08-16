Klangwerkstatt
==============

Gemeinsame Klangbeschaffung fuer Gruenspiel und Horde. Sammelt zu einem Klang
mehrere Kandidaten aus CC0-Quellen und aus ElevenLabs, damit man sie
nebeneinander anhoeren und auswaehlen kann.

Das Werkzeug wird ueber die Kommandozeile aufgerufen, nicht importiert. So ist
es egal, dass Horde ESM und Gruenspiel CommonJS ist.

    node <submodul>/bin/vorschlaege.mjs <kennung> \
      --ordner public/audio/vorschlaege \
      --suche "impact metal" \
      --ki "short dull metallic clank, industrial, close-miked" \
      --ki "heavy soft thud with a short hiss"

Jede Datei landet als `cc0-N.<ext>` oder `ki-N.mp3` im Unterordner `<kennung>`,
und `herkunft.json` haelt zu jeder Datei Titel, Quellseite und Lizenz fest.
Ohne diesen Nachweis gehoert kein Asset ins Spiel.

Zum Anhoeren und Auswaehlen gibt es zwei weitere Befehle. Die Oberflaeche baut
jedes Projekt selbst, geteilt sind nur die Daten und die Uebernahme.

    node <submodul>/bin/verzeichnis.mjs --ordner public/audio/vorschlaege \
                                        --netzpfad /audio/vorschlaege

gibt alle gesammelten Kennungen mit ihren Kandidaten als JSON aus, inklusive
Adresse zum Abspielen und Nachweis je Datei.

    node <submodul>/bin/uebernehmen.mjs --quelle <kandidat> --ziel <klangdatei>

wandelt den gewaehlten Kandidaten ins Format der Zieldatei und bringt ihn auf
einen einheitlichen Pegel. Ohne das sind CC0-Funde hoerbar lauter oder leiser
als erzeugte Klaenge. Braucht ffmpeg im PATH.

QUELLEN
-------
- **OpenGameArt** (`quellen/opengameart.mjs`): Suche mit Filter auf Klaenge und
  CC0, Dateien haengen als direkte Links auf der Inhaltsseite.
  FALLE: Die Suche ist streng UND-verknuepft. "smoke impact" findet nichts,
  obwohl es zu beiden Woertern Treffer gibt. Deshalb Wort fuer Wort suchen.
- **Kenney** (`quellen/kenney.mjs`): laedt die neun Audiopakete einmal nach
  `~/.klangwerkstatt/kenney/` und durchsucht sie dann nach Dateinamen.
  FALLE: Kenney schreibt sein HTML mit EINFACHEN Anfuehrungszeichen. Ein Muster
  auf `href="..."` findet den Paketlink nicht und die Seite sieht leer aus.
- **ElevenLabs** (`quellen/elevenlabs.mjs`): braucht ELEVENLABS_API_KEY in der
  Umgebung. Fehlt der Schluessel, entfallen nur die erzeugten Vorschlaege.

NICHT ERREICHBAR (Stand 16.08.2026, nicht erneut versuchen)
-----------------------------------------------------------
- itch.io und kenney.itch.io antworten mit 403, auch die Startseite.
- Pixabay antwortet mit 403.
- Freesound: die Suche geht, der Download braucht einen Account.
- archive.org liefert fast nur Sprachaufnahmen.

EINBINDEN
---------
    git submodule add <url> werkzeuge/klangwerkstatt

Danach ruft das Projekt `node werkzeuge/klangwerkstatt/bin/vorschlaege.mjs` auf.
Welcher Klang im Spiel wofuer benutzt wird, bleibt Sache des Projekts; hier
liegt nur die Beschaffung.

Auftraege an das KI-Modell schreiben
------------------------------------
Die Regeln stehen als Modul in `quellen/promptstil.mjs`, samt Begruendung. Kurz:

  - KURZ statt erzaehlend. "arrow impact into flesh, wet meaty thud" schlaegt
    einen ganzen Satz. Lange Beschreibungen verwaessern den Auftrag.
  - Audio-Fachbegriffe wirken: foley, close-mic, dry, transient.
  - Struktur: Objekt, Aktion, MATERIAL, RAUM, Klangcharakter. Ohne Material
    fehlt die Textur, ohne Raum wuerfelt das Modell den Hall.
  - Ein Klang je Auftrag, nie eine Abfolge.

`GRUNDTON` haengt an jede Beschreibung den Studioteil an, `TREUESTUFEN` streut
den prompt_influence ueber die Vorschlaege einer Runde. Ohne diese Streuung
bekommt man vier Fassungen derselben Idee statt vier Ideen.

Musik ist NICHT reproduzierbar
------------------------------
Derselbe Auftragstext liefert bei `/v1/music` jedes Mal eine NEUE Komposition,
nur die Stimmung stimmt ueberein. Wer ein bestimmtes Stueck wiederhaben will,
braucht dessen `seed`; `komponiere()` nimmt ihn entgegen. Eine Bestellung ohne
seed wirft eine getroffene Wahl unwiederbringlich weg (am 16.08.2026 in Horde
passiert, alle vier Stuecke mussten aus der Git-Historie geholt werden).

Quellen
-------
Freesound, OpenGameArt und Kenney, in dieser Reihenfolge. Freesound ist die
groesste und die einzige mit echter Volltextsuche (die anderen verknuepfen
streng UND, dort gehoeren EINZELWOERTER in `--suche`). Geholt wird die
Vorschau-mp3, nicht das Original: das ist oft 24 Bit und viele Megabyte gross,
waehrend im Spiel ohnehin eine kurze mp3 landet.

Zugangsschluessel stehen in `Life-OS/.secrets/credentials.env` und werden von
`quellen/geheimnisse.mjs` gesucht. Weil Horde und Gruenspiel NEBEN Life-OS
liegen und nicht darunter, wird auf jeder Ebene auch im Life-OS-Ordner
nachgesehen. Fehlt ein Schluessel, entfaellt die betreffende Quelle
stillschweigend und die anderen laufen weiter.
