import { describe, expect, it } from 'vitest';
import { MISURE, bmi, influenzeMorph, parametroAltezza, parametroPeso } from './corpo';

describe('corporatura → morph del modello 3D', () => {
  it('l’altezza media del modello corrisponde al valore 0,5', () => {
    expect(parametroAltezza(MISURE.m.media * 100, 'm')).toBeCloseTo(0.5);
    expect(parametroAltezza(MISURE.f.media * 100, 'f')).toBeCloseTo(0.5);
  });

  it('più alto = valore più alto, entro 0 e 1', () => {
    expect(parametroAltezza(190, 'm')).toBeGreaterThan(parametroAltezza(170, 'm'));
    expect(parametroAltezza(100, 'm')).toBe(0);
    expect(parametroAltezza(300, 'm')).toBe(1);
  });

  it('il peso si basa sul BMI: 22 = medio, 17 = minimo, 35 = massimo', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 1);
    expect(parametroPeso(22 * 1.75 ** 2, 175)).toBeCloseTo(0.5);
    expect(parametroPeso(17 * 1.75 ** 2, 175)).toBeCloseTo(0);
    expect(parametroPeso(35 * 1.75 ** 2, 175)).toBeCloseTo(1);
  });

  it('corpo medio = nessun morph', () => {
    const medio = influenzeMorph({ sesso: 'm', altezzaCm: MISURE.m.media * 100, pesoKg: 22 * MISURE.m.media ** 2, muscoli: 0.5 });
    expect(Object.values(medio).every((v) => Math.abs(v) < 1e-6)).toBe(true);
  });

  it('peso e muscoli si mescolano nella griglia 3×3 (pesi che sommano a 1 con il corpo medio)', () => {
    // Peso e muscoli al massimo: solo l'angolo peso2_muscoli2, non la somma di "più peso" e "più muscoli".
    const pieno = influenzeMorph({ sesso: 'm', altezzaCm: 175, pesoKg: 35 * 1.75 ** 2, muscoli: 1 });
    expect(pieno['peso2_muscoli2']).toBeCloseTo(1);
    expect(pieno['peso2_muscoli1'] ?? 0).toBeCloseTo(0);
    expect(pieno['peso1_muscoli2'] ?? 0).toBeCloseTo(0);

    // A metà strada: 4 angoli, il corpo medio prende il resto.
    const meta = influenzeMorph({ sesso: 'f', altezzaCm: 165, pesoKg: 28.5 * 1.65 ** 2, muscoli: 0.75 });
    expect(meta['peso2_muscoli2']).toBeCloseTo(0.25);
    expect(meta['peso2_muscoli1']).toBeCloseTo(0.25);
    expect(meta['peso1_muscoli2']).toBeCloseTo(0.25);
  });

  it('altezza: morph "altezza0" sotto la media, "altezza2" sopra', () => {
    expect(influenzeMorph({ sesso: 'm', altezzaCm: 150, pesoKg: 50, muscoli: 0.5 })['altezza0']).toBeGreaterThan(0);
    expect(influenzeMorph({ sesso: 'm', altezzaCm: 195, pesoKg: 85, muscoli: 0.5 })['altezza2']).toBeGreaterThan(0);
  });
});
