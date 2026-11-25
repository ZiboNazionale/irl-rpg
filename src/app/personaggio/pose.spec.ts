import { describe, expect, it } from 'vitest';
import { POSE, rotazioniPosa } from './pose';

describe('pose', () => {
  it('il lato destro è lo specchio del sinistro (Y e Z cambiano segno, X no)', () => {
    const r = rotazioniPosa(POSE.find((p) => p.id === 'naturale')!);
    expect(r['upperarm01.L']).toEqual([['z', -42]]);
    expect(r['upperarm01.R']).toEqual([['z', 42]]);
    expect(r['lowerarm01.R']).toEqual([['x', -8]]);
  });

  it('le pose asimmetriche non vengono specchiate', () => {
    const pugno = rotazioniPosa(POSE.find((p) => p.id === 'pugno')!);
    expect(pugno['upperarm01.R']).toEqual([['z', -128]]);
    expect(pugno['upperarm01.L']).toEqual([['z', -42]]);
  });

  it('tutte le pose uniscono un po’ le gambe e hanno id diversi', () => {
    for (const p of POSE) expect(rotazioniPosa(p)['upperleg01.L']).toBeDefined();
    expect(new Set(POSE.map((p) => p.id)).size).toBe(POSE.length);
  });
});
