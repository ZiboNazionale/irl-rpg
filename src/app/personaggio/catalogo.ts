import { Sesso } from './corpo';

/** Un capo o una parte del personaggio (capelli, maglia, scarpe…), esportato da Blender. */
export interface Capo {
  id: string;
  nome: string;
  /** Il modello 3D (con scheletro e forme), relativo a `modelli/`. */
  file: string;
  /** La texture di colore, relativa a `modelli/`. */
  texture?: string;
  /** L'immagine per la griglia di scelta, relativa a `modelli/`. */
  anteprima?: string;
  /** Con trasparenza (capelli, sopracciglia, ciglia). */
  trasparente?: boolean;
  /** Il bit dei vertici del corpo nascosti sotto questo capo (attributi `_nascosto1/2`). */
  bitNascosto?: number;
}

export interface CatalogoSesso {
  corpo: string;
  /** Posizioni delle ossa (Y in alto) in ogni forma del corpo, relativo a `modelli/`. */
  ossa: string;
  ciglia: Capo;
  occhi: Capo;
  /** Le texture della pelle: id che contiene "caucasian", "asian" o "african". */
  pelli: { id: string; texture: string }[];
  /** Le texture degli occhi (il colore dell'iride). */
  iridi: { id: string; nome: string; texture: string }[];
  sopracciglia: Capo[];
  capelli: Capo[];
  completi: Capo[];
  maglie: Capo[];
  pantaloni: Capo[];
  scarpe: Capo[];
  cappelli: Capo[];
  occhiali: Capo[];
}

export type Catalogo = Record<Sesso, CatalogoSesso>;

let caricamento: Promise<Catalogo> | undefined;

/** Il catalogo dei capi, scaricato una volta sola. */
export function catalogo(): Promise<Catalogo> {
  return (caricamento ??= fetch('modelli/catalogo.json').then((r) => {
    if (!r.ok) throw new Error('Catalogo dei capi non disponibile');
    return r.json() as Promise<Catalogo>;
  }));
}
