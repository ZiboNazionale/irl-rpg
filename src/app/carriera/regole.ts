/**
 * Le regole della carriera: missioni del giorno, XP e livelli, serie, malus e sfide.
 * Sono funzioni pure: prendono lo stato e restituiscono quello nuovo, così si testano bene.
 *
 * In breve:
 * - ogni giorno 4 missioni, una per gruppo, sulle caratteristiche più deboli;
 * - completarle dà XP (più la serie è lunga, più XP: fino a +50%) e fa crescere la caratteristica;
 * - le missioni non fatte, alla fine della giornata, tolgono XP e progressi (malus);
 * - i giorni in cui non si apre nemmeno l'app costano XP e Disciplina;
 * - una ricaduta in una cattiva abitudine costa XP e un po' di caratteristica;
 * - le sfide della settimana danno molti XP una volta raggiunte.
 */
import { CARATTERISTICHE, GRUPPI, Punteggi } from '../caratteristiche/caratteristiche';
import { Difficolta, MISSIONI, Missione, RICADUTE } from './missioni';

export const XP_MISSIONE: Record<Difficolta, number> = { facile: 20, media: 35, difficile: 50 };
export const PROGRESSO_MISSIONE: Record<Difficolta, number> = { facile: 1, media: 2, difficile: 3 };
export const MALUS_MISSIONE = 15;
export const MALUS_RICADUTA = 25;
export const MALUS_GIORNO_SALTATO = 30;
/** Oltre questi giorni di assenza il malus non cresce più (niente punizioni infinite). */
export const MAX_GIORNI_SALTATI = 3;
/** Una caratteristica non scende più di così sotto il valore del test. */
export const CALO_MASSIMO = 15;

export interface Giorno {
  missioni: string[];
  fatte: string[];
  /** XP presi da ogni missione fatta (per poterla annullare nello stesso giorno). */
  xp: Record<string, number>;
  ricadute: string[];
  /** Come stai oggi, da 1 a 5. */
  umore?: number;
  chiuso?: boolean;
}

export interface VoceDiario {
  data: string;
  testo: string;
  xp: number;
}

export interface Carriera {
  xp: number;
  giorni: Record<string, Giorno>;
  /** Punti verso il prossimo +1 (o −1, se negativi) di ogni caratteristica. */
  progressi: Record<string, number>;
  /** Quanto è cambiata ogni caratteristica rispetto al test. */
  bonus: Record<string, number>;
  /** Sfide riscattate: "settimana:id". */
  sfide: string[];
  diario: VoceDiario[];
}

export const CARRIERA_VUOTA: Carriera = { xp: 0, giorni: {}, progressi: {}, bonus: {}, sfide: [], diario: [] };

// ---------- Date ----------

export function dataIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function aggiungiGiorni(data: string, giorni: number): string {
  const d = new Date(data + 'T12:00:00');
  d.setDate(d.getDate() + giorni);
  return dataIso(d);
}

/** Il lunedì della settimana di quella data (le sfide sono settimanali). */
export function inizioSettimana(data: string): string {
  const d = new Date(data + 'T12:00:00');
  return aggiungiGiorni(data, -((d.getDay() + 6) % 7));
}

/** Un numero pseudo-casuale ma sempre uguale per lo stesso testo (per scegliere le missioni). */
function hash(testo: string): number {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) h = Math.imul(h ^ testo.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---------- Livelli ----------

/** XP per passare dal livello n al n+1: ogni livello costa un po' di più (grinding). */
export const xpPerLivello = (n: number) => 100 + 25 * (n - 1);

export function livello(xp: number): { livello: number; nelLivello: number; perProssimo: number } {
  let n = 1;
  let resto = Math.max(0, xp);
  while (resto >= xpPerLivello(n)) {
    resto -= xpPerLivello(n);
    n++;
  }
  return { livello: n, nelLivello: resto, perProssimo: xpPerLivello(n) };
}

// ---------- Caratteristiche ----------

/** Punti necessari per +1: più la caratteristica è alta, più è lento salire. */
export const sogliaProgresso = (valore: number) => 3 + Math.floor(valore / 25);

const limita = (v: number) => Math.max(1, Math.min(99, v));

/** Le caratteristiche di adesso: test + quanto sono cambiate, più serie e umore per la Mente. */
export function caratteristicheEffettive(base: Punteggi, c: Carriera, oggi: string): Punteggi {
  const risultato: Punteggi = {};
  for (const { id } of CARATTERISTICHE) risultato[id] = limita((base[id] ?? 35) + (c.bonus[id] ?? 0));
  // Motivazione: la serie in corso dà fino a +15.
  risultato['motivazione'] = limita(risultato['motivazione'] + Math.min(15, serie(c, oggi) * 2));
  // Benessere: i check-in degli ultimi 7 giorni contano sempre di più rispetto al test.
  const umori = Array.from({ length: 7 }, (_, i) => c.giorni[aggiungiGiorni(oggi, -i)]?.umore).filter((u): u is number => !!u);
  if (umori.length) {
    const media = umori.reduce((a, b) => a + b, 0) / umori.length;
    const peso = (umori.length / 7) * 0.7;
    risultato['benessere'] = limita(Math.round(risultato['benessere'] * (1 - peso) + (10 + (media - 1) * 20) * peso));
  }
  return risultato;
}

/** Aggiunge (o toglie) progresso a una caratteristica: a soglia raggiunta sale (o scende) di 1. */
export function progresso(c: Carriera, base: Punteggi, id: string, delta: number): Carriera {
  const progressi = { ...c.progressi };
  const bonus = { ...c.bonus };
  let p = (progressi[id] ?? 0) + delta;
  let b = bonus[id] ?? 0;
  const valore = () => (base[id] ?? 35) + b;
  while (p >= sogliaProgresso(valore()) && valore() < 99) {
    p -= sogliaProgresso(valore());
    b++;
  }
  while (p < 0 && b > -CALO_MASSIMO && valore() > 1) {
    b--;
    p += sogliaProgresso(valore());
  }
  progressi[id] = Math.max(p, 0);
  bonus[id] = b;
  return { ...c, progressi, bonus };
}

// ---------- Giornate ----------

/** Le 4 missioni del giorno: per ogni gruppo una delle due caratteristiche più deboli. */
export function scegliMissioni(data: string, punteggi: Punteggi): Missione[] {
  return GRUPPI.map((gruppo) => {
    const deboli = CARATTERISTICHE.filter((c) => c.gruppo === gruppo)
      .sort((a, b) => (punteggi[a.id] ?? 35) - (punteggi[b.id] ?? 35))
      .slice(0, 2);
    const scelta = deboli[hash(data + gruppo) % deboli.length];
    const lista = MISSIONI.filter((m) => m.caratteristica === scelta.id);
    return lista[hash(data + scelta.id) % lista.length];
  });
}

/** Il giorno di oggi, creato con le sue missioni se non c'era. */
export function giornoDi(c: Carriera, data: string, punteggi: Punteggi): Carriera {
  if (c.giorni[data]) return c;
  const missioni = scegliMissioni(data, punteggi).map((m) => m.id);
  return { ...c, giorni: { ...c.giorni, [data]: { missioni, fatte: [], xp: {}, ricadute: [] } } };
}

/** Giorni di fila con almeno una missione fatta, fino a oggi (oggi conta solo se già iniziato). */
export function serie(c: Carriera, oggi: string): number {
  let data = c.giorni[oggi]?.fatte.length ? oggi : aggiungiGiorni(oggi, -1);
  let n = 0;
  while (c.giorni[data]?.fatte.length) {
    n++;
    data = aggiungiGiorni(data, -1);
  }
  return n;
}

/** Il bonus di XP della serie: +10% al giorno, fino a +50%. */
export const moltiplicatoreSerie = (giorni: number) => 1 + Math.min(0.5, giorni * 0.1);

const scrivi = (c: Carriera, data: string, testo: string, xp: number): Carriera => ({
  ...c,
  diario: [...c.diario, { data, testo, xp }].slice(-300),
});

/** Completa una missione di oggi. */
export function completa(c: Carriera, oggi: string, idMissione: string, base: Punteggi): Carriera {
  const giorno = c.giorni[oggi];
  const missione = MISSIONI.find((m) => m.id === idMissione);
  if (!giorno || !missione || !giorno.missioni.includes(idMissione) || giorno.fatte.includes(idMissione)) return c;
  const xp = Math.round(XP_MISSIONE[missione.difficolta] * moltiplicatoreSerie(serie(c, oggi)));
  let nuova: Carriera = {
    ...c,
    xp: c.xp + xp,
    giorni: { ...c.giorni, [oggi]: { ...giorno, fatte: [...giorno.fatte, idMissione], xp: { ...giorno.xp, [idMissione]: xp } } },
  };
  nuova = progresso(nuova, base, missione.caratteristica, PROGRESSO_MISSIONE[missione.difficolta]);
  return scrivi(nuova, oggi, `Missione: ${missione.titolo}`, xp);
}

/** Annulla una missione segnata per errore (solo nello stesso giorno). */
export function annulla(c: Carriera, oggi: string, idMissione: string, base: Punteggi): Carriera {
  const giorno = c.giorni[oggi];
  const missione = MISSIONI.find((m) => m.id === idMissione);
  if (!giorno || !missione || !giorno.fatte.includes(idMissione)) return c;
  const xp = giorno.xp[idMissione] ?? 0;
  const { [idMissione]: _, ...altri } = giorno.xp;
  let nuova: Carriera = {
    ...c,
    xp: Math.max(0, c.xp - xp),
    giorni: { ...c.giorni, [oggi]: { ...giorno, fatte: giorno.fatte.filter((f) => f !== idMissione), xp: altri } },
  };
  nuova = progresso(nuova, base, missione.caratteristica, -PROGRESSO_MISSIONE[missione.difficolta]);
  return scrivi(nuova, oggi, `Annullata: ${missione.titolo}`, -xp);
}

/** Segna una ricaduta (una volta al giorno per abitudine): malus di XP e caratteristica. */
export function ricaduta(c: Carriera, oggi: string, idRicaduta: string, base: Punteggi): Carriera {
  const giorno = c.giorni[oggi];
  const r = RICADUTE.find((x) => x.id === idRicaduta);
  if (!giorno || !r || giorno.ricadute.includes(idRicaduta)) return c;
  let nuova: Carriera = {
    ...c,
    xp: Math.max(0, c.xp - MALUS_RICADUTA),
    giorni: { ...c.giorni, [oggi]: { ...giorno, ricadute: [...giorno.ricadute, idRicaduta] } },
  };
  nuova = progresso(nuova, base, r.caratteristica, -2);
  return scrivi(nuova, oggi, `Ricaduta: ${r.nome}`, -MALUS_RICADUTA);
}

/** Il check-in di oggi: come stai, da 1 a 5 (influenza il Benessere). */
export function umore(c: Carriera, oggi: string, valore: number): Carriera {
  const giorno = c.giorni[oggi];
  if (!giorno || !Number.isInteger(valore) || valore < 1 || valore > 5) return c;
  return { ...c, giorni: { ...c.giorni, [oggi]: { ...giorno, umore: valore } } };
}

/**
 * Chiude le giornate passate: malus per le missioni non fatte, Disciplina su o giù, e malus
 * per i giorni in cui non si è nemmeno aperta l'app (al massimo MAX_GIORNI_SALTATI).
 */
export function chiudiGiorni(c: Carriera, oggi: string, base: Punteggi): Carriera {
  let nuova = c;
  const passati = Object.keys(c.giorni).filter((d) => d < oggi).sort();
  for (const data of passati) {
    const giorno = nuova.giorni[data];
    if (giorno.chiuso) continue;
    const mancate = giorno.missioni.filter((id) => !giorno.fatte.includes(id));
    for (const id of mancate) {
      const missione = MISSIONI.find((m) => m.id === id);
      if (missione) nuova = progresso(nuova, base, missione.caratteristica, -1);
    }
    const malus = mancate.length * MALUS_MISSIONE;
    nuova = progresso(nuova, base, 'disciplina', mancate.length === 0 ? 2 : -mancate.length);
    nuova = { ...nuova, xp: Math.max(0, nuova.xp - malus), giorni: { ...nuova.giorni, [data]: { ...giorno, chiuso: true } } };
    nuova = scrivi(
      nuova,
      data,
      mancate.length ? `Giornata chiusa: ${mancate.length} missioni non fatte` : 'Giornata perfetta: tutte le missioni fatte',
      -malus,
    );
  }

  // Giorni senza nemmeno aprire l'app, tra l'ultimo registrato e oggi: si registrano tutti
  // (così non si contano due volte), ma costano solo i primi MAX_GIORNI_SALTATI.
  const ultimo = passati.at(-1);
  if (ultimo) {
    let saltati = 0;
    for (let d = aggiungiGiorni(ultimo, 1); d < oggi; d = aggiungiGiorni(d, 1)) {
      if (nuova.giorni[d]) continue;
      const vuoto = { missioni: [], fatte: [], xp: {}, ricadute: [], chiuso: true };
      nuova = { ...nuova, giorni: { ...nuova.giorni, [d]: vuoto } };
      if (saltati >= MAX_GIORNI_SALTATI) continue;
      saltati++;
      nuova = progresso(nuova, base, 'disciplina', -2);
      nuova = scrivi({ ...nuova, xp: Math.max(0, nuova.xp - MALUS_GIORNO_SALTATO) }, d, 'Giorno saltato', -MALUS_GIORNO_SALTATO);
    }
  }
  return nuova;
}

// ---------- Sfide della settimana ----------

export interface Sfida {
  id: string;
  nome: string;
  descrizione: string;
  xp: number;
  /** Progresso attuale e obiettivo. */
  avanzamento: (c: Carriera, oggi: string) => [number, number];
}

const giorniSettimana = (oggi: string) => Array.from({ length: 7 }, (_, i) => aggiungiGiorni(inizioSettimana(oggi), i)).filter((d) => d <= oggi);

export const SFIDE: Sfida[] = [
  {
    id: 'missioni15',
    nome: 'Macina-missioni',
    descrizione: 'Completa 15 missioni questa settimana.',
    xp: 200,
    avanzamento: (c, oggi) => [giorniSettimana(oggi).reduce((n, d) => n + (c.giorni[d]?.fatte.length ?? 0), 0), 15],
  },
  {
    id: 'serie5',
    nome: 'Inarrestabile',
    descrizione: 'Arriva a una serie di 5 giorni di fila.',
    xp: 150,
    avanzamento: (c, oggi) => [Math.min(serie(c, oggi), 5), 5],
  },
  {
    id: 'perfetti3',
    nome: 'Tre su tre',
    descrizione: 'Fai tutte le missioni del giorno per 3 giorni questa settimana.',
    xp: 250,
    avanzamento: (c, oggi) => [
      giorniSettimana(oggi).filter((d) => {
        const g = c.giorni[d];
        return !!g && g.missioni.length > 0 && g.missioni.every((m) => g.fatte.includes(m));
      }).length,
      3,
    ],
  },
  {
    id: 'pulito',
    nome: 'Pulito',
    descrizione: 'Nessuna ricaduta per tutta la settimana (almeno 5 giorni attivi).',
    xp: 150,
    avanzamento: (c, oggi) => {
      const giorni = giorniSettimana(oggi);
      const ricadute = giorni.some((d) => (c.giorni[d]?.ricadute.length ?? 0) > 0);
      return [ricadute ? 0 : giorni.filter((d) => c.giorni[d]?.fatte.length).length, 5];
    },
  },
];

/** Riscatta una sfida completata (una volta per settimana). */
export function riscatta(c: Carriera, oggi: string, idSfida: string): Carriera {
  const sfida = SFIDE.find((s) => s.id === idSfida);
  const chiave = `${inizioSettimana(oggi)}:${idSfida}`;
  if (!sfida || c.sfide.includes(chiave)) return c;
  const [fatto, obiettivo] = sfida.avanzamento(c, oggi);
  if (fatto < obiettivo) return c;
  return scrivi({ ...c, xp: c.xp + sfida.xp, sfide: [...c.sfide, chiave] }, oggi, `Sfida vinta: ${sfida.nome}`, sfida.xp);
}

export const sfidaRiscattata = (c: Carriera, oggi: string, idSfida: string) => c.sfide.includes(`${inizioSettimana(oggi)}:${idSfida}`);
