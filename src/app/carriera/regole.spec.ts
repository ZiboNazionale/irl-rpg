import { describe, expect, it } from 'vitest';
import { CARATTERISTICHE, Punteggi } from '../caratteristiche/caratteristiche';
import { MISSIONI } from './missioni';
import {
  CARRIERA_VUOTA,
  Carriera,
  MALUS_GIORNO_SALTATO,
  MALUS_MISSIONE,
  MALUS_RICADUTA,
  MAX_GIORNI_SALTATI,
  XP_MISSIONE,
  aggiungiGiorni,
  annulla,
  caratteristicheEffettive,
  chiudiGiorni,
  completa,
  giornoDi,
  inizioSettimana,
  livello,
  moltiplicatoreSerie,
  progresso,
  ricaduta,
  riscatta,
  scegliMissioni,
  serie,
  umore,
  xpPerLivello,
} from './regole';

const base: Punteggi = Object.fromEntries(CARATTERISTICHE.map((c) => [c.id, 50]));
const OGGI = '2026-11-25';

/** Un giorno con le sue missioni, tutte fatte o no. */
const conGiorno = (c: Carriera, data: string, fatte: boolean): Carriera => {
  let n = giornoDi(c, data, base);
  if (fatte) for (const id of n.giorni[data].missioni) n = completa(n, data, id, base);
  return n;
};

describe('livelli', () => {
  it('ogni livello costa 25 XP in più del precedente', () => {
    expect(xpPerLivello(1)).toBe(100);
    expect(xpPerLivello(2)).toBe(125);
    expect(livello(0)).toEqual({ livello: 1, nelLivello: 0, perProssimo: 100 });
    expect(livello(100)).toEqual({ livello: 2, nelLivello: 0, perProssimo: 125 });
    expect(livello(230).livello).toBe(3);
  });
});

describe('missioni del giorno', () => {
  it('sono 4, una per gruppo, e sempre le stesse per lo stesso giorno', () => {
    const a = scegliMissioni(OGGI, base);
    expect(a.length).toBe(4);
    expect(scegliMissioni(OGGI, base).map((m) => m.id)).toEqual(a.map((m) => m.id));
    const gruppi = a.map((m) => CARATTERISTICHE.find((c) => c.id === m.caratteristica)!.gruppo);
    expect(new Set(gruppi).size).toBe(4);
  });

  it('allenano le caratteristiche più deboli del gruppo', () => {
    const debole = { ...base, forza: 10, mobilita: 12 };
    const corpo = scegliMissioni(OGGI, debole)[0];
    expect(['forza', 'mobilita']).toContain(corpo.caratteristica);
  });

  it('ogni caratteristica ha missioni di tutte e tre le difficoltà', () => {
    for (const c of CARATTERISTICHE) {
      const diff = new Set(MISSIONI.filter((m) => m.caratteristica === c.id).map((m) => m.difficolta));
      expect(diff.size, c.nome).toBe(3);
    }
  });
});

describe('completare e annullare', () => {
  it('completare dà XP e progresso; annullare li toglie', () => {
    let c = giornoDi(CARRIERA_VUOTA, OGGI, base);
    const id = c.giorni[OGGI].missioni[0];
    const missione = MISSIONI.find((m) => m.id === id)!;
    c = completa(c, OGGI, id, base);
    expect(c.xp).toBe(XP_MISSIONE[missione.difficolta]);
    expect(completa(c, OGGI, id, base)).toBe(c); // non si completa due volte
    c = annulla(c, OGGI, id, base);
    expect(c.xp).toBe(0);
    expect(c.giorni[OGGI].fatte).toEqual([]);
  });

  it('una missione che non è di oggi non conta', () => {
    const c = giornoDi(CARRIERA_VUOTA, OGGI, base);
    const altra = MISSIONI.find((m) => !c.giorni[OGGI].missioni.includes(m.id))!;
    expect(completa(c, OGGI, altra.id, base)).toBe(c);
  });

  it('la serie aumenta gli XP fino a +50%', () => {
    expect(moltiplicatoreSerie(0)).toBe(1);
    expect(moltiplicatoreSerie(3)).toBeCloseTo(1.3);
    expect(moltiplicatoreSerie(20)).toBe(1.5);
    let c = CARRIERA_VUOTA;
    for (let i = 3; i >= 1; i--) c = conGiorno(c, aggiungiGiorni(OGGI, -i), true);
    expect(serie(c, OGGI)).toBe(3);
    c = giornoDi(c, OGGI, base);
    const id = c.giorni[OGGI].missioni[0];
    const difficolta = MISSIONI.find((m) => m.id === id)!.difficolta;
    const prima = c.xp;
    c = completa(c, OGGI, id, base);
    expect(c.xp - prima).toBe(Math.round(XP_MISSIONE[difficolta] * 1.3));
  });
});

describe('caratteristiche', () => {
  it('a soglia di progresso salgono di 1, e possono anche scendere (ma non troppo)', () => {
    let c = progresso(CARRIERA_VUOTA, base, 'forza', 5); // soglia a 50 = 5
    expect(c.bonus['forza']).toBe(1);
    expect(caratteristicheEffettive(base, c, OGGI)['forza']).toBe(51);
    c = progresso(CARRIERA_VUOTA, base, 'forza', -1000);
    expect(c.bonus['forza']).toBe(-15);
  });

  it('la serie alza la Motivazione e i check-in pesano sul Benessere', () => {
    let c = CARRIERA_VUOTA;
    for (let i = 3; i >= 1; i--) c = conGiorno(c, aggiungiGiorni(OGGI, -i), true);
    expect(caratteristicheEffettive(base, c, OGGI)['motivazione']).toBe(56);
    for (let i = 6; i >= 0; i--) {
      const d = aggiungiGiorni(OGGI, -i);
      c = umore(giornoDi(c, d, base), d, 5);
    }
    expect(caratteristicheEffettive(base, c, OGGI)['benessere']).toBeGreaterThan(70);
  });
});

describe('malus', () => {
  it('a fine giornata ogni missione non fatta toglie XP', () => {
    const ieri = aggiungiGiorni(OGGI, -1);
    let c = { ...giornoDi(CARRIERA_VUOTA, ieri, base), xp: 500 };
    c = chiudiGiorni(c, OGGI, base);
    expect(c.xp).toBe(500 - 4 * MALUS_MISSIONE);
    expect(c.giorni[ieri].chiuso).toBe(true);
    expect(chiudiGiorni(c, OGGI, base).xp).toBe(c.xp); // non si chiude due volte
  });

  it('una giornata perfetta fa salire la Disciplina', () => {
    const c = conGiorno(CARRIERA_VUOTA, aggiungiGiorni(OGGI, -1), true);
    // Una delle missioni del giorno può già essere di Disciplina: si guarda solo cosa aggiunge la chiusura.
    const dopo = chiudiGiorni(c, OGGI, base);
    const punti = (x: Carriera) => (x.bonus['disciplina'] ?? 0) * 100 + (x.progressi['disciplina'] ?? 0);
    expect(punti(dopo)).toBeGreaterThan(punti(c));
  });

  it('i giorni senza aprire l\'app costano, ma al massimo per 3 giorni', () => {
    let c = { ...conGiorno(CARRIERA_VUOTA, aggiungiGiorni(OGGI, -10), true), xp: 1000 };
    const prima = c.xp;
    c = chiudiGiorni(c, OGGI, base);
    expect(prima - c.xp).toBe(MAX_GIORNI_SALTATI * MALUS_GIORNO_SALTATO);
    // Richiamarla di nuovo (es. alla riapertura) non toglie altro.
    expect(chiudiGiorni(c, OGGI, base)).toBe(c);
  });

  it('una ricaduta costa XP una volta al giorno', () => {
    let c = { ...giornoDi(CARRIERA_VUOTA, OGGI, base), xp: 100 };
    c = ricaduta(c, OGGI, 'fumo', base);
    expect(c.xp).toBe(100 - MALUS_RICADUTA);
    expect(ricaduta(c, OGGI, 'fumo', base)).toBe(c);
  });

  it('gli XP non scendono sotto zero', () => {
    const c = ricaduta(giornoDi(CARRIERA_VUOTA, OGGI, base), OGGI, 'alcol', base);
    expect(c.xp).toBe(0);
  });
});

describe('sfide della settimana', () => {
  it('si riscattano solo se completate, una volta per settimana', () => {
    let c = CARRIERA_VUOTA;
    expect(riscatta(c, OGGI, 'serie5')).toBe(c);
    const lunedi = inizioSettimana(OGGI);
    for (let i = 5; i >= 1; i--) c = conGiorno(c, aggiungiGiorni(OGGI, -i), true);
    const prima = c.xp;
    c = riscatta(c, OGGI, 'serie5');
    expect(c.xp).toBe(prima + 150);
    expect(riscatta(c, OGGI, 'serie5')).toBe(c);
    expect(lunedi <= OGGI).toBe(true);
  });
});
