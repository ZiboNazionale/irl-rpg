/**
 * Trasforma la corporatura reale (sesso, altezza in cm, peso in kg, muscolatura)
 * nei valori dei "morph" dei modelli 3D esportati da Blender con MPFB (MakeHuman).
 *
 * C'è un modello per sesso. Ognuno parte dal corpo medio (peso, muscoli e altezza a 0,5)
 * e ha come morph:
 * - la griglia di MakeHuman di peso × muscoli: "peso<0|1|2>_muscoli<0|1|2>" (0 = minimo,
 *   1 = medio, 2 = massimo; manca peso1_muscoli1, che è il corpo di partenza). Si mescolano
 *   i 4 angoli più vicini, come fa MakeHuman: sommare "più peso" e "più muscoli" separati
 *   deformerebbe il corpo (soprattutto il petto);
 * - "altezza0" e "altezza2": il corpo più basso e più alto.
 */

export type Sesso = 'm' | 'f';

export interface Corporatura {
  sesso: Sesso;
  altezzaCm: number;
  pesoKg: number;
  /** Da 0 (poco muscoloso) a 1 (molto muscoloso). */
  muscoli: number;
}

/** Altezze reali dei modelli (in metri) ai valori minimo, medio e massimo. Misurate in Blender. */
export const MISURE = {
  m: { min: 1.3735, media: 1.7291, max: 2.4308 },
  f: { min: 1.2352, media: 1.5912, max: 2.2923 },
} as const;

export const LIMITI = {
  altezzaCm: { min: 140, max: 210 },
  pesoKg: { min: 35, max: 180 },
} as const;

const limita = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Il valore 0–1 dell'altezza di MakeHuman che dà quell'altezza reale. */
export function parametroAltezza(altezzaCm: number, sesso: Sesso): number {
  const { min, media, max } = MISURE[sesso];
  const m = altezzaCm / 100;
  return m <= media ? limita(0.5 * (m - min) / (media - min)) : limita(0.5 + 0.5 * (m - media) / (max - media));
}

/** Indice di massa corporea. */
export const bmi = (pesoKg: number, altezzaCm: number) => pesoKg / (altezzaCm / 100) ** 2;

/**
 * Il valore 0–1 del peso di MakeHuman a partire dal BMI:
 * 17 o meno = molto magro, 22 = normopeso, 35 o più = obesità grave.
 */
export function parametroPeso(pesoKg: number, altezzaCm: number): number {
  const b = bmi(pesoKg, altezzaCm);
  return b <= 22 ? limita(0.5 * (b - 17) / 5) : limita(0.5 + 0.5 * (b - 22) / 13);
}

/** Le influenze dei morph per una corporatura (i morph non elencati valgono 0). */
export function influenzeMorph(c: Corporatura): Record<string, number> {
  const influenze: Record<string, number> = {};

  // Interpolazione bilineare nella griglia 3×3 di peso e muscoli.
  const p = parametroPeso(c.pesoKg, c.altezzaCm) * 2;
  const m = limita(c.muscoli) * 2;
  const p0 = Math.min(Math.floor(p), 1);
  const m0 = Math.min(Math.floor(m), 1);
  const fp = p - p0;
  const fm = m - m0;
  const angoli: [number, number, number][] = [
    [p0, m0, (1 - fp) * (1 - fm)],
    [p0 + 1, m0, fp * (1 - fm)],
    [p0, m0 + 1, (1 - fp) * fm],
    [p0 + 1, m0 + 1, fp * fm],
  ];
  for (const [ip, im, peso] of angoli) {
    if ((ip !== 1 || im !== 1) && peso > 0) influenze[`peso${ip}_muscoli${im}`] = peso;
  }

  const h = parametroAltezza(c.altezzaCm, c.sesso);
  if (h < 0.5) influenze['altezza0'] = (0.5 - h) * 2;
  if (h > 0.5) influenze['altezza2'] = (h - 0.5) * 2;
  return influenze;
}
