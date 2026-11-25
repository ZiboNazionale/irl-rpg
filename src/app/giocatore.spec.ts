import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DOMANDE } from './caratteristiche/caratteristiche';
import { Giocatore, salvataggioValido } from './giocatore';

describe('Giocatore', () => {
  beforeEach(() => localStorage.clear());

  const crea = () => TestBed.inject(Giocatore);

  it('salva aspetto e risposte nel browser', () => {
    const g = crea();
    g.cambiaNome('Zibo');
    g.cambiaAspetto({ altezzaCm: 182, pesoKg: 80 });
    g.rispondi(0, 4);
    TestBed.tick();

    const salvato = JSON.parse(localStorage.getItem('irl-rpg-v4')!);
    expect(salvato.nome).toBe('Zibo');
    expect(salvato.aspetto.altezzaCm).toBe(182);
    expect(salvato.risposte[0]).toBe(4);
    expect(salvataggioValido(salvato)).toBe(true);
  });

  it('concludere il test calcola le caratteristiche, rifarlo le azzera', () => {
    const g = crea();
    DOMANDE.forEach((_, i) => g.rispondi(i, 3));
    g.concludiTest();
    expect(g.caratteristiche()?.['disciplina']).toBe(72);

    g.rifaiTest();
    expect(g.caratteristiche()).toBeNull();
    expect(g.domandeRisposte()).toBe(0);
  });

  it('non sovrascrive un salvataggio rovinato', async () => {
    localStorage.setItem('irl-rpg-v4', '{rotto');
    const g = crea();
    await Promise.resolve();
    expect(g.salvataggioRovinato()).toBe(true);
    g.cambiaNome('Altro');
    TestBed.tick();
    expect(localStorage.getItem('irl-rpg-v4')).toBe('{rotto');
  });

  it('rifiuta salvataggi con valori fuori dai limiti', () => {
    const g = crea();
    const dati = { ...g.dati(), aspetto: { ...g.dati().aspetto, altezzaCm: 400 } };
    expect(salvataggioValido(dati)).toBe(false);
    expect(salvataggioValido({ ...g.dati(), risposte: [1, 2] })).toBe(false);
  });
});
