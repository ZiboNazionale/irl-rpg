import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Giocatore } from '../giocatore';
import { Avatar3d } from './avatar-3d';
import { ASPETTO_INIZIALE, Aspetto, COLORI_CAPELLI, COLORI_VESTITI, NESSUNO, TONI_PELLE } from './aspetto';
import { Capo, CatalogoSesso, catalogo } from './catalogo';
import { LIMITI, Sesso, bmi } from './corpo';
import { POSE } from './pose';

type Scheda = 'fisico' | 'viso' | 'capelli' | 'abiti' | 'scarpe' | 'accessori' | 'posa';
type CampoColore = 'coloreOcchi' | 'coloreCapelli' | 'coloreCompleto' | 'coloreMaglia' | 'colorePantaloni' | 'coloreScarpe' | 'coloreCappello';
type CampoCapo = 'capelli' | 'completo' | 'maglia' | 'pantaloni' | 'scarpe' | 'cappello' | 'occhiali' | 'sopracciglia';

/** Una voce della griglia di scelta. */
interface Voce {
  id: string;
  nome: string;
  anteprima?: string;
}

/** Passo 1: crea il personaggio. Schede come in una modalità carriera, con anteprime dei capi. */
@Component({
  selector: 'app-creatore',
  imports: [Avatar3d, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './creatore.html',
  styleUrl: './creatore.scss',
})
export class Creatore {
  protected readonly giocatore = inject(Giocatore);
  readonly continua = output<void>();
  /** Se il test è già fatto, il pulsante riporta alla carriera invece che al test. */
  readonly testFatto = input(false);

  protected readonly aspetto = this.giocatore.aspetto;
  protected readonly scheda = signal<Scheda>('fisico');
  protected readonly limiti = LIMITI;
  protected readonly coloriCapelli = COLORI_CAPELLI;
  protected readonly coloriVestiti = COLORI_VESTITI;
  protected readonly toni = TONI_PELLE;
  protected readonly NESSUNO = NESSUNO;

  protected readonly schede: { id: Scheda; nome: string; icona: string }[] = [
    { id: 'fisico', nome: 'Fisico', icona: 'M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-5 8h10l-1.5 10h-7Z' },
    { id: 'viso', nome: 'Viso', icona: 'M12 3c4 0 6 3 6 7.5S15.5 21 12 21s-6-6-6-10.5S8 3 12 3Zm-2.5 7.5h.01M14.5 10.5h.01M10 15.5c1.3.9 2.7.9 4 0' },
    { id: 'capelli', nome: 'Capelli', icona: 'M5 13c0-6 3-9 7-9s7 3 7 9c-2-3-5-4-7-4s-5 1-7 4Zm0 0v5m14-5v5' },
    { id: 'abiti', nome: 'Abiti', icona: 'M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c-1 2-2.5 3-4 3S9 5 8 3Z' },
    { id: 'scarpe', nome: 'Scarpe', icona: 'M3 15c3 0 5-2 6-6l4 1c1 3 4 4 8 5v3H3Z' },
    { id: 'accessori', nome: 'Accessori', icona: 'M3 13h4l1.5-2h7L17 13h4M6.5 13a3 3 0 1 0 0 .1Zm11 0a3 3 0 1 0 0 .1Z' },
    { id: 'posa', nome: 'Posa', icona: 'M12 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM5 9l7 1 7-3M12 10v5l-4 6m4-6 4 6' },
  ];

  protected readonly pose = POSE;
  /** La parte del corpo selezionata nella scheda Posa. */
  protected readonly parte = signal<string | null>(null);
  protected readonly posaModificata = computed(() => Object.keys(this.giocatore.dati().posaLibera).length > 0);
  protected readonly suggerimento = computed(() => {
    if (this.scheda() !== 'posa') return 'Trascina per girare il personaggio';
    const p = this.parte();
    return p ? `Stai muovendo: ${p}` : 'Clicca su una parte del corpo per muoverla';
  });

  private readonly catalogoCompleto = signal<Record<Sesso, CatalogoSesso> | null>(null);
  protected readonly cat = computed(() => this.catalogoCompleto()?.[this.aspetto().sesso] ?? null);

  private voci(lista: Capo[] | undefined, nessuno?: string): Voce[] {
    return [...(nessuno ? [{ id: NESSUNO, nome: nessuno }] : []), ...(lista ?? [])];
  }
  protected readonly capelli = computed(() => this.voci(this.cat()?.capelli, 'Rasati'));
  protected readonly maglie = computed(() => this.voci(this.cat()?.maglie));
  protected readonly pantaloni = computed(() => this.voci(this.cat()?.pantaloni));
  protected readonly scarpe = computed(() => this.voci(this.cat()?.scarpe));
  protected readonly cappelli = computed(() => this.voci(this.cat()?.cappelli, 'Nessuno'));
  protected readonly occhiali = computed(() => this.voci(this.cat()?.occhiali, 'Nessuno'));
  protected readonly sopracciglia = computed(() => this.voci(this.cat()?.sopracciglia));

  protected readonly bmi = computed(() => bmi(this.aspetto().pesoKg, this.aspetto().altezzaCm));
  protected readonly descrizioneBmi = computed(() => {
    const b = this.bmi();
    return b < 18.5 ? 'sottopeso' : b < 25 ? 'normopeso' : b < 30 ? 'sovrappeso' : 'obesità';
  });
  protected readonly inquadratura = computed(() => (this.scheda() === 'viso' || this.scheda() === 'capelli' ? 'viso' : 'corpo'));

  protected readonly nomeValido = computed(() => this.giocatore.dati().nome.trim().length > 0);
  protected readonly provato = signal(false);

  constructor() {
    catalogo().then((c) => this.catalogoCompleto.set(c), () => this.catalogoCompleto.set(null));
  }

  protected cambia(modifica: Partial<Aspetto>) {
    this.giocatore.cambiaAspetto(modifica);
  }

  protected colore(campo: CampoColore, colore: string) {
    this.cambia({ [campo]: colore });
  }

  /** Il colore attuale di un campo, per il selettore libero ("" = un grigio neutro). */
  protected valoreColore(campo: CampoColore | 'pelle'): string {
    const v = this.aspetto()[campo];
    return /^#[0-9a-f]{6}$/i.test(v) ? v : campo === 'pelle' ? '#e2b49c' : '#808080';
  }

  /** Un colore libero è attivo se non è uno di quelli pronti della lista. */
  protected liberoAttivo(campo: CampoColore, lista: string[]): boolean {
    const v = this.aspetto()[campo];
    return v !== '' && !lista.includes(v);
  }

  /** Sceglie un capo; il suo colore riparte dall'originale. */
  protected scegli(campo: CampoCapo, id: string) {
    const modifica: Partial<Aspetto> = { [campo]: id };
    const colori: Partial<Record<CampoCapo, CampoColore>> = {
      completo: 'coloreCompleto', maglia: 'coloreMaglia', pantaloni: 'colorePantaloni', scarpe: 'coloreScarpe', cappello: 'coloreCappello',
    };
    const c = colori[campo];
    if (c) modifica[c] = '';
    this.cambia(modifica);
  }

  /** Cambiare sesso tiene la corporatura e rimette viso e capi di quel modello. */
  protected sesso(s: Sesso) {
    if (s === this.aspetto().sesso) return;
    const { altezzaCm, pesoKg, muscoli, pelle, occhi } = this.aspetto();
    this.cambia({ ...ASPETTO_INIZIALE[s], altezzaCm, pesoKg, muscoli, pelle, occhi });
  }

  /** Numeri scritti a mano: si accettano solo valori nei limiti. */
  protected numero(campo: 'altezzaCm' | 'pesoKg', valore: string) {
    const n = Math.round(Number(valore));
    const { min, max } = LIMITI[campo];
    if (Number.isFinite(n) && n >= min && n <= max) this.cambia({ [campo]: n });
  }

  protected avanti() {
    this.provato.set(true);
    if (this.nomeValido()) this.continua.emit();
    else this.scheda.set('fisico');
  }
}
