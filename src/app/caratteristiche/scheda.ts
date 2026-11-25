import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Giocatore } from '../giocatore';
import { Avatar3d } from '../personaggio/avatar-3d';
import { CARATTERISTICHE, GRUPPI, complessivo } from './caratteristiche';
import { Copertina } from './copertina';

/** La carta del giocatore: personaggio 3D, complessivo e tutte le caratteristiche. */
@Component({
  selector: 'app-scheda',
  imports: [Avatar3d, Copertina],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scheda.html',
  styleUrl: './scheda.scss',
})
export class Scheda {
  protected readonly giocatore = inject(Giocatore);
  /** Subito dopo il test: la carta si "rivela" e da qui si entra in carriera. */
  readonly rivelazione = input(false);
  readonly inizia = output<void>();
  readonly modificaPersonaggio = output<void>();
  readonly rifaiTest = output<void>();

  protected readonly punteggi = computed(() => this.giocatore.caratteristiche()!);
  protected readonly ovr = computed(() => complessivo(this.punteggi()));
  protected readonly copertina = signal(false);
  protected readonly mente = computed(() => CARATTERISTICHE.filter((c) => c.gruppo === 'Mente'));
  protected readonly gruppi = GRUPPI.filter((g) => g !== 'Mente').map((g) => ({
    nome: g,
    caratteristiche: CARATTERISTICHE.filter((c) => c.gruppo === g),
  }));
  /** Le 6 sigle sulla carta: le migliori abilità. */
  protected readonly migliori = computed(() =>
    CARATTERISTICHE.filter((c) => c.gruppo !== 'Mente')
      .map((c) => ({ ...c, valore: this.punteggi()[c.id] }))
      .sort((a, b) => b.valore - a.valore)
      .slice(0, 6),
  );

  /** Quanto è cambiata una caratteristica rispetto al test (missioni, malus, serie, umore). */
  protected variazione(id: string): number {
    const test = this.giocatore.caratteristicheTest();
    return test ? this.punteggi()[id] - test[id] : 0;
  }

  /** Colore della barra: rosso sotto 40, giallo fino a 60, verde chiaro fino a 75, accento sopra. */
  protected livello(v: number) {
    return v < 40 ? 'basso' : v < 60 ? 'medio' : v < 75 ? 'buono' : 'alto';
  }
}
