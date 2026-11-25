import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { DOMANDE, Punteggi, calcolaCaratteristiche, complessivo } from './caratteristiche/caratteristiche';
import {
  CARRIERA_VUOTA,
  Carriera,
  annulla,
  caratteristicheEffettive,
  chiudiGiorni,
  completa,
  dataIso,
  giornoDi,
  livello,
  ricaduta,
  riscatta,
  serie,
  umore,
} from './carriera/regole';
import { ASPETTO_INIZIALE, Aspetto } from './personaggio/aspetto';
import { LIMITI } from './personaggio/corpo';

const CHIAVE = 'irl-rpg-v4';

export interface DatiGiocatore {
  versione: 4;
  nome: string;
  aspetto: Aspetto;
  /** Una risposta (0–4) per domanda, null se non ancora data. */
  risposte: (number | null)[];
  /** Le caratteristiche calcolate dal test, null finché il test non è finito. */
  caratteristiche: Punteggi | null;
  /** La posa della copertina. */
  posa: string;
  /** Le rotazioni fatte a mano sopra la posa: osso -> quaternione [x, y, z, w]. */
  posaLibera: Record<string, number[]>;
  /** Missioni, XP, livelli, sfide e diario. */
  carriera: Carriera;
}

export interface Avviso {
  testo: string;
  tipo: 'livello' | 'xp' | 'malus' | 'info';
}

const nuovo = (): DatiGiocatore => ({
  versione: 4,
  nome: '',
  aspetto: { ...ASPETTO_INIZIALE.m },
  risposte: DOMANDE.map(() => null),
  caratteristiche: null,
  posa: 'naturale',
  posaLibera: {},
  carriera: structuredClone(CARRIERA_VUOTA),
});

const COLORE = /^(#[0-9a-f]{6})?$/i;
const ID = /^[a-z0-9_-]{1,60}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const intero = (n: unknown, min: number, max: number) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
const elencoId = (x: unknown, max = 20) => Array.isArray(x) && x.length <= max && x.every((v) => typeof v === 'string' && ID.test(v));

/** Controlla la carriera di un salvataggio: struttura, tipi e dimensioni ragionevoli. */
function carrieraValida(c: unknown): c is Carriera {
  if (!c || typeof c !== 'object') return false;
  const k = c as Carriera;
  const numeri = (o: unknown) =>
    !!o && typeof o === 'object' && Object.keys(o).length <= 40 &&
    Object.entries(o).every(([id, v]) => ID.test(id) && intero(v, -1000, 1000));
  return (
    intero(k.xp, 0, 10_000_000) &&
    numeri(k.progressi) &&
    numeri(k.bonus) &&
    elencoId(k.sfide?.map((s) => s.replace(':', '_')), 2000) &&
    !!k.giorni && typeof k.giorni === 'object' && Object.keys(k.giorni).length <= 5000 &&
    Object.entries(k.giorni).every(([data, g]) =>
      DATA.test(data) && !!g && elencoId(g.missioni) && elencoId(g.fatte) && elencoId(g.ricadute) &&
      numeri(g.xp) && (g.umore === undefined || intero(g.umore, 1, 5)) && (g.chiuso === undefined || typeof g.chiuso === 'boolean')) &&
    Array.isArray(k.diario) && k.diario.length <= 300 &&
    k.diario.every((v) => !!v && DATA.test(v.data) && typeof v.testo === 'string' && v.testo.length <= 200 && intero(v.xp, -10_000, 10_000))
  );
}

/** Controlla un salvataggio letto dal browser (o importato): mai fidarsi del contenuto. */
export function salvataggioValido(dati: unknown): dati is DatiGiocatore {
  if (!dati || typeof dati !== 'object') return false;
  const d = dati as DatiGiocatore;
  const a = d.aspetto;
  return (
    d.versione === 4 &&
    typeof d.nome === 'string' &&
    d.nome.length <= 30 &&
    !!a &&
    (a.sesso === 'm' || a.sesso === 'f') &&
    Number.isFinite(a.altezzaCm) && a.altezzaCm >= LIMITI.altezzaCm.min && a.altezzaCm <= LIMITI.altezzaCm.max &&
    Number.isFinite(a.pesoKg) && a.pesoKg >= LIMITI.pesoKg.min && a.pesoKg <= LIMITI.pesoKg.max &&
    Number.isFinite(a.muscoli) && a.muscoli >= 0 && a.muscoli <= 1 &&
    (typeof a.pelle === 'string' && (ID.test(a.pelle) || /^#[0-9a-f]{6}$/i.test(a.pelle))) &&
    (['coloreOcchi', 'coloreCapelli', 'coloreCompleto', 'coloreMaglia', 'colorePantaloni', 'coloreScarpe', 'coloreCappello'] as const)
      .every((k) => typeof a[k] === 'string' && COLORE.test(a[k])) &&
    (['occhi', 'sopracciglia', 'capelli', 'completo', 'maglia', 'pantaloni', 'scarpe', 'cappello', 'occhiali'] as const)
      .every((k) => typeof a[k] === 'string' && ID.test(a[k])) &&
    typeof d.posa === 'string' && ID.test(d.posa) &&
    !!d.posaLibera && typeof d.posaLibera === 'object' && Object.keys(d.posaLibera).length <= 40 &&
    Object.entries(d.posaLibera).every(([k, q]) => /^[A-Za-z0-9_]{1,40}$/.test(k) && Array.isArray(q) && q.length === 4 &&
      q.every((n) => Number.isFinite(n) && Math.abs(n) <= 1.0001)) &&
    Array.isArray(d.risposte) &&
    d.risposte.length === DOMANDE.length &&
    d.risposte.every((r) => r === null || (Number.isInteger(r) && r >= 0 && r <= 4)) &&
    (d.caratteristiche === null || (typeof d.caratteristiche === 'object' &&
      Object.values(d.caratteristiche).every((v) => Number.isInteger(v) && v >= 1 && v <= 99))) &&
    carrieraValida(d.carriera)
  );
}

/** Aggiunge i campi nuovi ai salvataggi delle versioni precedenti dell'app. */
function aggiorna(dati: unknown): unknown {
  if (dati && typeof dati === 'object') {
    const d = dati as Partial<DatiGiocatore>;
    d.posa ??= 'naturale';
    d.posaLibera ??= {};
    d.carriera ??= structuredClone(CARRIERA_VUOTA);
    if (d.aspetto) d.aspetto.coloreOcchi ??= '';
  }
  return dati;
}

/** Il giocatore, salvato nel browser a ogni modifica. */
@Injectable({ providedIn: 'root' })
export class Giocatore {
  private readonly stato = signal<DatiGiocatore>(this.carica());
  /** Vero se il salvataggio nel browser era rovinato: in quel caso non viene sovrascritto. */
  readonly salvataggioRovinato = signal(false);
  /** La data di oggi (si aggiorna da sola a mezzanotte). */
  readonly oggi = signal(dataIso(new Date()));
  /** L'ultimo avviso da mostrare (level up, XP, malus…). */
  readonly avviso = signal<Avviso | null>(null);

  readonly dati = this.stato.asReadonly();
  readonly aspetto = computed(() => this.stato().aspetto);
  /** Le caratteristiche del test (punto di partenza). */
  readonly caratteristicheTest = computed(() => this.stato().caratteristiche);
  /** Le caratteristiche di adesso: test + missioni, malus, serie e umore. */
  readonly caratteristiche = computed(() => {
    const base = this.stato().caratteristiche;
    return base ? caratteristicheEffettive(base, this.stato().carriera, this.oggi()) : null;
  });
  readonly domandeRisposte = computed(() => this.stato().risposte.filter((r) => r !== null).length);
  readonly carriera = computed(() => this.stato().carriera);
  readonly livello = computed(() => livello(this.stato().carriera.xp));
  readonly serie = computed(() => serie(this.stato().carriera, this.oggi()));
  readonly giorno = computed(() => this.stato().carriera.giorni[this.oggi()] ?? null);
  readonly ovr = computed(() => {
    const c = this.caratteristiche();
    return c ? complessivo(c) : 0;
  });

  constructor() {
    effect(() => {
      const dati = this.stato();
      if (this.salvataggioRovinato()) return;
      try {
        localStorage.setItem(CHIAVE, JSON.stringify(dati));
      } catch {
        // Spazio pieno o salvataggio bloccato: l'app funziona lo stesso finché resta aperta.
      }
    });

    // Ogni volta che cambia il giorno (o finisce il test): chiude i giorni passati e prepara oggi.
    effect(() => {
      const oggi = this.oggi();
      if (!this.stato().caratteristiche) return;
      this.modificaCarriera((c, base) => giornoDi(chiudiGiorni(c, oggi, base), oggi, caratteristicheEffettive(base, c, oggi)));
    });

    if (typeof window !== 'undefined') {
      const timer = setInterval(() => this.oggi.set(dataIso(new Date())), 60_000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  private carica(): DatiGiocatore {
    try {
      const testo = localStorage.getItem(CHIAVE);
      if (testo === null) return nuovo();
      const dati = aggiorna(JSON.parse(testo));
      if (salvataggioValido(dati)) return dati;
    } catch {
      // Ricade nel caso sotto.
    }
    queueMicrotask(() => this.salvataggioRovinato.set(true));
    return nuovo();
  }

  /** Applica una regola della carriera e avvisa di XP guadagnati o persi e dei cambi di livello. */
  private modificaCarriera(regola: (c: Carriera, base: Punteggi) => Carriera) {
    const base = this.stato().caratteristiche;
    if (!base) return;
    const prima = this.stato().carriera;
    const dopo = regola(prima, base);
    if (dopo === prima) return;
    this.stato.update((d) => ({ ...d, carriera: dopo }));

    const [l1, l2] = [livello(prima.xp).livello, livello(dopo.xp).livello];
    const differenza = dopo.xp - prima.xp;
    if (l2 > l1) this.avviso.set({ testo: `Livello ${l2}! Continua così.`, tipo: 'livello' });
    else if (l2 < l1) this.avviso.set({ testo: `Sei sceso al livello ${l2}. Si riparte dalla prossima missione.`, tipo: 'malus' });
    else if (differenza > 0) this.avviso.set({ testo: `+${differenza} XP`, tipo: 'xp' });
    else if (differenza < 0) this.avviso.set({ testo: `${differenza} XP`, tipo: 'malus' });
  }

  completaMissione(id: string) {
    this.modificaCarriera((c, base) => completa(c, this.oggi(), id, base));
  }

  annullaMissione(id: string) {
    this.modificaCarriera((c, base) => annulla(c, this.oggi(), id, base));
  }

  segnaRicaduta(id: string) {
    this.modificaCarriera((c, base) => ricaduta(c, this.oggi(), id, base));
  }

  segnaUmore(valore: number) {
    this.modificaCarriera((c) => umore(c, this.oggi(), valore));
  }

  riscattaSfida(id: string) {
    this.modificaCarriera((c) => riscatta(c, this.oggi(), id));
  }

  cambiaNome(nome: string) {
    this.stato.update((d) => ({ ...d, nome: nome.slice(0, 30) }));
  }

  cambiaAspetto(modifica: Partial<Aspetto>) {
    this.stato.update((d) => ({ ...d, aspetto: { ...d.aspetto, ...modifica } }));
  }

  /** Una posa pronta: toglie le modifiche fatte a mano. */
  cambiaPosa(posa: string) {
    this.stato.update((d) => ({ ...d, posa, posaLibera: {} }));
  }

  cambiaPosaLibera(posaLibera: Record<string, number[]>) {
    this.stato.update((d) => ({ ...d, posaLibera }));
  }

  rispondi(indice: number, risposta: number) {
    this.stato.update((d) => ({ ...d, risposte: d.risposte.map((r, i) => (i === indice ? risposta : r)) }));
  }

  /** Chiude il test: calcola le caratteristiche dalle risposte date. */
  concludiTest() {
    this.stato.update((d) => ({ ...d, caratteristiche: calcolaCaratteristiche(d.risposte) }));
  }

  /** Rifà il test da capo, tenendo personaggio e carriera. */
  rifaiTest() {
    this.stato.update((d) => ({ ...d, risposte: DOMANDE.map(() => null), caratteristiche: null }));
  }

  /** Il salvataggio come testo JSON, da scaricare come copia. */
  esporta(): string {
    return JSON.stringify(this.stato(), null, 1);
  }

  /** Ripristina un salvataggio esportato. Restituisce false se il file non è valido. */
  importa(testo: string): boolean {
    try {
      const dati = aggiorna(JSON.parse(testo));
      if (!salvataggioValido(dati)) return false;
      this.salvataggioRovinato.set(false);
      this.stato.set(dati);
      this.avviso.set({ testo: 'Salvataggio ripristinato.', tipo: 'info' });
      return true;
    } catch {
      return false;
    }
  }

  /** Riparte da zero (personaggio, test e carriera). */
  ricomincia() {
    this.salvataggioRovinato.set(false);
    this.stato.set(nuovo());
  }
}
