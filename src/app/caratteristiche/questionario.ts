import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { Giocatore } from '../giocatore';
import { CARATTERISTICHE, DOMANDE } from './caratteristiche';

/** Passo 2: le 45 domande, una alla volta. Rispondere passa alla domanda successiva. */
@Component({
  selector: 'app-questionario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questionario.html',
  styleUrl: './questionario.scss',
})
export class Questionario {
  protected readonly giocatore = inject(Giocatore);
  readonly indietro = output<void>();
  readonly finito = output<void>();

  protected readonly totale = DOMANDE.length;
  /** Si riparte dalla prima domanda senza risposta. */
  protected readonly indice = signal(Math.max(0, this.giocatore.dati().risposte.findIndex((r) => r === null)));
  protected readonly domanda = computed(() => DOMANDE[this.indice()]);
  protected readonly caratteristica = computed(() => CARATTERISTICHE.find((c) => c.id === this.domanda().caratteristica)!);
  protected readonly scelta = computed(() => this.giocatore.dati().risposte[this.indice()]);
  protected readonly avanzamento = computed(() => this.giocatore.domandeRisposte() / this.totale);
  /** Numero della domanda dentro la sua caratteristica (1–3). */
  protected readonly parte = computed(() => {
    const id = this.domanda().caratteristica;
    return DOMANDE.slice(0, this.indice() + 1).filter((d) => d.caratteristica === id).length;
  });

  protected rispondi(risposta: number) {
    this.giocatore.rispondi(this.indice(), risposta);
    if (this.indice() < this.totale - 1) this.indice.update((i) => i + 1);
    else this.concludi();
  }

  protected precedente() {
    if (this.indice() === 0) this.indietro.emit();
    else this.indice.update((i) => i - 1);
  }

  protected successiva() {
    if (this.scelta() !== null && this.indice() < this.totale - 1) this.indice.update((i) => i + 1);
  }

  private concludi() {
    // Tutte le domande devono avere una risposta: altrimenti si torna alla prima saltata.
    const mancante = this.giocatore.dati().risposte.findIndex((r) => r === null);
    if (mancante >= 0) {
      this.indice.set(mancante);
      return;
    }
    this.giocatore.concludiTest();
    this.finito.emit();
  }

  /** Tasti da 1 a 5 per rispondere, frecce per spostarsi. */
  protected tasto(evento: KeyboardEvent) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    const n = Number(evento.key);
    if (n >= 1 && n <= 5) {
      evento.preventDefault();
      this.rispondi(n - 1);
    } else if (evento.key === 'ArrowLeft') {
      this.precedente();
    } else if (evento.key === 'ArrowRight') {
      this.successiva();
    }
  }
}
