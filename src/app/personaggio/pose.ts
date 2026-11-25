/**
 * Le pose del personaggio. Ogni posa ruota alcune ossa dello scheletro MakeHuman.
 * Le rotazioni sono in gradi attorno agli assi del mondo (X verso la sinistra del personaggio,
 * Y in alto, Z verso la telecamera) e si applicano dalle ossa padre alle figlie: ogni osso
 * ruota a partire da dove l'ha portato il padre (la posa di riposo è a braccia aperte, a
 * circa 45° sotto l'orizzontale). Per il lato destro si specchiano da sole.
 */

export type Asse = 'x' | 'y' | 'z';
export type Rotazione = [Asse, number];

export interface Posa {
  id: string;
  nome: string;
  /** Ossa del lato sinistro (".L"): il destro (".R") è speculare. Le altre ossa senza lato. */
  ossa: Record<string, Rotazione[]>;
  /** Solo un lato, senza specchiare (es. un braccio alzato). */
  asimmetrica?: boolean;
}

export const POSE: Posa[] = [
  {
    id: 'naturale',
    nome: 'In piedi',
    ossa: {
      'upperarm01.L': [['z', -42]],
      'lowerarm01.L': [['x', -8]],
    },
  },
  {
    id: 'fianchi',
    nome: 'Mani sui fianchi',
    ossa: {
      'upperarm01.L': [['z', -12], ['y', 15]],
      'lowerarm01.L': [['z', -100], ['y', 20]],
    },
  },
  {
    id: 'conserte',
    nome: 'Braccia conserte',
    // Un avambraccio un po' più alto dell'altro, così non si compenetrano.
    asimmetrica: true,
    ossa: {
      'upperarm01.L': [['z', -46], ['x', -18]],
      'lowerarm01.L': [['x', -52], ['y', -80]],
      'upperarm01.R': [['z', 46], ['x', -16]],
      'lowerarm01.R': [['x', -36], ['y', 82]],
    },
  },
  {
    id: 'esulta',
    nome: 'Esultanza',
    ossa: {
      'upperarm01.L': [['z', 105], ['x', -10]],
      'lowerarm01.L': [['z', 15]],
      head: [['x', -12]],
    },
  },
  {
    id: 'pugno',
    nome: 'Pugno al cielo',
    asimmetrica: true,
    ossa: {
      'upperarm01.R': [['z', -128]],
      'lowerarm01.R': [['z', -8]],
      'upperarm01.L': [['z', -42]],
      'lowerarm01.L': [['x', -8]],
      head: [['x', -6]],
    },
  },
];

/** Gambe un po' più unite della posa di riposo di MakeHuman, in tutte le pose. */
const GAMBE: Record<string, Rotazione[]> = { 'upperleg01.L': [['z', -3]], 'upperleg01.R': [['z', 3]] };

/** Le rotazioni di tutte le ossa per una posa, con il lato destro specchiato. */
export function rotazioniPosa(posa: Posa): Record<string, Rotazione[]> {
  const risultato: Record<string, Rotazione[]> = { ...GAMBE, ...posa.ossa };
  if (posa.asimmetrica) return risultato;
  for (const [osso, rotazioni] of Object.entries(posa.ossa)) {
    if (!osso.endsWith('.L')) continue;
    // Specchio rispetto al piano YZ: le rotazioni attorno a Y e Z cambiano segno, attorno a X no.
    risultato[osso.slice(0, -2) + '.R'] = rotazioni.map(([asse, gradi]) => [asse, asse === 'x' ? gradi : -gradi]);
  }
  return risultato;
}
