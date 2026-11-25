import { Corporatura, Sesso } from './corpo';

/**
 * Tutto ciò che si vede del personaggio. I capi (capelli, completo, maglia…) sono id del
 * catalogo generato da Blender (`modelli/catalogo.json`). I colori "" = colore originale.
 */
export interface Aspetto extends Corporatura {
  /** Id del tono di pelle (vedi TONI_PELLE) oppure un colore "#rrggbb" scelto a mano. */
  pelle: string;
  occhi: string;
  /** Colore dell'iride scelto a mano ("" = quello della texture degli occhi). */
  coloreOcchi: string;
  sopracciglia: string;
  capelli: string;
  coloreCapelli: string;
  /** Non più usato: maglia e pantaloni si scelgono sempre separati (resta NESSUNO per i salvataggi). */
  completo: string;
  coloreCompleto: string;
  maglia: string;
  coloreMaglia: string;
  pantaloni: string;
  colorePantaloni: string;
  scarpe: string;
  coloreScarpe: string;
  cappello: string;
  coloreCappello: string;
  occhiali: string;
}

export const NESSUNO = 'nessuno';

/**
 * Toni di pelle: una delle texture di MakeHuman (chiara, olivastra, scura) per un
 * moltiplicatore di colore, così i toni sono davvero distinti tra loro.
 */
export const TONI_PELLE = [
  { id: 'molto-chiara', nome: 'Molto chiara', texture: 'caucasian', fattore: [1.12, 1.08, 1.06] },
  { id: 'chiara', nome: 'Chiara', texture: 'caucasian', fattore: [0.95, 0.88, 0.82] },
  { id: 'media', nome: 'Media', texture: 'caucasian', fattore: [0.74, 0.6, 0.47] },
  { id: 'olivastra', nome: 'Olivastra', texture: 'asian', fattore: [0.6, 0.5, 0.34] },
  { id: 'ambrata', nome: 'Ambrata', texture: 'african', fattore: [1.6, 1.32, 1.1] },
  { id: 'scura', nome: 'Scura', texture: 'african', fattore: [1.05, 1, 0.97] },
  { id: 'molto-scura', nome: 'Molto scura', texture: 'african', fattore: [0.62, 0.58, 0.56] },
] as const;

/** Il colore medio della pelle chiara di MakeHuman: un colore scelto a mano si ottiene moltiplicando per colore / questo. */
export const PELLE_RIFERIMENTO = '#e2b49c';

export const COLORI_CAPELLI = ['', '#14100d', '#3b2416', '#6e4526', '#a97842', '#d9b77a', '#8a8a8a', '#b8402a'];
export const COLORI_VESTITI = ['', '#f4f4f0', '#15171c', '#c2f85a', '#1d4ed8', '#dc2626', '#f59e0b', '#7c3aed', '#0d9488', '#8b5e3c'];

const comune = {
  muscoli: 0.5,
  pelle: 'chiara',
  occhi: 'brown',
  coloreOcchi: '',
  coloreCapelli: '',
  coloreCompleto: '',
  coloreMaglia: '',
  pantaloni: 'cortu_cargo_pants',
  colorePantaloni: '',
  scarpe: 'shoes05',
  coloreScarpe: '',
  cappello: NESSUNO,
  coloreCappello: '',
  occhiali: NESSUNO,
};

/** Il personaggio di partenza: vestito casual, t-shirt e jeans con sneakers bianche. */
export const ASPETTO_INIZIALE: Record<Sesso, Aspetto> = {
  m: {
    ...comune,
    sesso: 'm',
    altezzaCm: 176,
    pesoKg: 72,
    sopracciglia: 'eyebrow001',
    capelli: 'short02',
    completo: NESSUNO,
    maglia: 'toigo_basic_tucked_t-shirt',
  },
  f: {
    ...comune,
    sesso: 'f',
    altezzaCm: 165,
    pesoKg: 58,
    sopracciglia: 'eyebrow010',
    capelli: 'ponytail01',
    completo: NESSUNO,
    maglia: 'toigo_basic_tucked_t-shirt',
  },
};
