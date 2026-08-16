/** Blendet Musikstuecke ineinander, statt hart umzuschalten.
 *
 *     const musik = erzeugeMusik({ menue: 'assets/musik/menue.mp3' });
 *     musik.setzeSzene('menue');
 *
 * Zwei Spuren laufen abwechselnd: die neue wird aufgezogen, waehrend die alte
 * zurueckgeht. Die Anteile folgen Sinus und Kosinus, damit die SUMME der
 * Lautstaerken konstant bleibt; mit linearen Rampen saeckt die Musik in der
 * Mitte hoerbar ab. Uebernommen aus dem Gruenspiel und hier geteilt, weil
 * beide Spiele dieselbe Blende brauchen.
 *
 * Der Browser verbietet Ton vor der ersten Geste. spieltNoch() meldet, ob es
 * geklappt hat; nach einer Geste hilft nochmal setzeSzene(dieselbeSzene, true).
 */
const BLENDE_MS = 1200;
const SCHRITT_MS = 40;

export function anteile(fortschritt) {
  const p = Math.max(0, Math.min(1, fortschritt));
  return { neu: Math.sin((p * Math.PI) / 2), alt: Math.cos((p * Math.PI) / 2) };
}

export function erzeugeMusik(dateien, { blendeMs = BLENDE_MS, erzeugeSpur } = {}) {
  const neueSpur = erzeugeSpur ?? (() => {
    const el = new Audio();
    el.preload = 'auto';
    el.loop = true;
    el.volume = 0;
    return el;
  });

  const spuren = [{ el: neueSpur(), anteil: 0 }, { el: neueSpur(), anteil: 0 }];
  let aktiv = 0;
  let szene = null;
  let pegel = 0.6;
  let uhr = null;

  function wendeAn() {
    for (const spur of spuren) spur.el.volume = Math.max(0, Math.min(1, spur.anteil * pegel));
  }

  function blende(alt, neu) {
    clearInterval(uhr);
    const start = performance.now();
    const altAnfang = alt ? alt.anteil : 0;

    uhr = setInterval(() => {
      const teile = anteile((performance.now() - start) / blendeMs);
      if (neu) neu.anteil = teile.neu;
      if (alt) alt.anteil = altAnfang * teile.alt;
      wendeAn();

      if (performance.now() - start < blendeMs) return;
      clearInterval(uhr);
      uhr = null;
      if (alt && alt !== neu) {
        alt.el.pause();
        alt.anteil = 0;
        wendeAn();
      }
    }, SCHRITT_MS);
  }

  function setzeSzene(name, erneut = false) {
    if (name === szene && !erneut) return;
    szene = name;

    // Nur auf paused pruefen, nicht auf den Anteil: wechselt die Szene, bevor die
    // vorige Blende ihren ersten Tick hatte, ist der Anteil noch 0 und die Spur
    // liefe sonst stumm weiter, bis sie irgendwann zufaellig wieder drankommt.
    const alt = spuren[aktiv];
    const laeuftAlt = !alt.el.paused;
    const datei = dateien[name];
    if (!datei) {
      blende(laeuftAlt ? alt : null, null);
      return;
    }

    aktiv = 1 - aktiv;
    const neu = spuren[aktiv];
    if (neu.el.src !== datei) neu.el.src = datei;
    neu.el.currentTime = 0;
    neu.anteil = 0;
    wendeAn();
    const versuch = neu.el.play();
    if (versuch && versuch.catch) versuch.catch(() => {});
    blende(laeuftAlt ? alt : null, neu);
  }

  return {
    setzeSzene,
    szene: () => szene,
    setzePegel: (wert) => { pegel = Math.max(0, Math.min(1, wert)); wendeAn(); },
    pegel: () => pegel,
    spieltNoch: () => spuren.some((spur) => !spur.el.paused && spur.anteil > 0.01),
  };
}
