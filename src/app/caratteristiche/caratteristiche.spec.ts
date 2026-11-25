import { describe, expect, it } from 'vitest';
import { CARATTERISTICHE, DOMANDE, VALORE_SENZA_RISPOSTE, calcolaCaratteristiche, complessivo, ruolo } from './caratteristiche';

describe('caratteristiche', () => {
  it('ogni caratteristica ha esattamente 3 domande con 5 risposte', () => {
    for (const c of CARATTERISTICHE) {
      const domande = DOMANDE.filter((d) => d.caratteristica === c.id);
      expect(domande.length, c.nome).toBe(3);
      domande.forEach((d) => expect(d.risposte.length).toBe(5));
    }
    expect(DOMANDE.length).toBe(45);
  });

  it('il punteggio è la media dei punti delle risposte', () => {
    const risposte = DOMANDE.map(() => 2); // tutte risposte centrali = 53
    risposte[0] = 4; // una risposta massima sulla resistenza: (91 + 53 + 53) / 3
    const p = calcolaCaratteristiche(risposte);
    expect(p['resistenza']).toBe(66);
    expect(p['forza']).toBe(53);
  });

  it('senza risposte una caratteristica parte dal valore di base', () => {
    const p = calcolaCaratteristiche(DOMANDE.map(() => null));
    expect(Object.values(p).every((v) => v === VALORE_SENZA_RISPOSTE)).toBe(true);
  });

  it('ignora risposte non valide', () => {
    const p = calcolaCaratteristiche(DOMANDE.map(() => 7));
    expect(p['focus']).toBe(VALORE_SENZA_RISPOSTE);
  });

  it('OVR e ruolo seguono le abilità migliori (la Mente non conta nell’OVR)', () => {
    const risposte = DOMANDE.map((d) => (d.caratteristica === 'carisma' || d.caratteristica === 'umorismo' ? 4 : 0));
    const p = calcolaCaratteristiche(risposte);
    expect(ruolo(p)).toBe('Leader brillante');
    expect(ruolo(p, 'f')).toBe('Leader brillante');
    expect(complessivo(p)).toBe(Math.round((91 * 2 + 15 * 10) / 12));
    expect(complessivo({ ...p, disciplina: 99, motivazione: 99, benessere: 99 })).toBe(complessivo(p));
  });
});
