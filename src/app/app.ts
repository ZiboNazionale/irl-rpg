import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Questionario } from './caratteristiche/questionario';
import { Scheda } from './caratteristiche/scheda';
import { Centro } from './carriera/centro';
import { Giocatore } from './giocatore';
import { Creatore } from './personaggio/creatore';

type Passo = 'personaggio' | 'test' | 'rivelazione' | 'carriera';

@Component({
  selector: 'app-root',
  imports: [Creatore, Questionario, Scheda, Centro],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly giocatore = inject(Giocatore);
  /** Si riparte da dove si era rimasti: con il test fatto si entra direttamente in carriera. */
  protected readonly passo = signal<Passo>(
    this.giocatore.caratteristiche() ? 'carriera' : this.giocatore.domandeRisposte() > 0 ? 'test' : 'personaggio',
  );

  constructor() {
    // Gli avvisi (XP, livelli, malus) spariscono da soli dopo qualche secondo.
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      if (!this.giocatore.avviso()) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.giocatore.avviso.set(null), 2800);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected vai(passo: Passo) {
    this.passo.set(passo);
    window.scrollTo({ top: 0 });
  }

  /** Dal personaggio: al test se non è ancora fatto, altrimenti di nuovo in carriera. */
  protected dopoPersonaggio() {
    this.vai(this.giocatore.caratteristiche() ? 'carriera' : 'test');
  }

  protected rifaiTest() {
    this.giocatore.rifaiTest();
    this.vai('test');
  }
}
