import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { CARATTERISTICHE } from '../caratteristiche/caratteristiche';
import { Scheda } from '../caratteristiche/scheda';
import { Giocatore } from '../giocatore';
import { MISSIONI, Missione, RICADUTE } from './missioni';
import {
  MALUS_GIORNO_SALTATO,
  MALUS_MISSIONE,
  MALUS_RICADUTA,
  SFIDE,
  XP_MISSIONE,
  moltiplicatoreSerie,
  sfidaRiscattata,
} from './regole';

type Sezione = 'oggi' | 'abitudini' | 'sfide' | 'diario' | 'profilo';

/** Il centro giocatore: missioni del giorno, abitudini, sfide, diario e profilo. */
@Component({
  selector: 'app-centro',
  imports: [Scheda],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './centro.html',
  styleUrl: './centro.scss',
})
export class Centro {
  protected readonly giocatore = inject(Giocatore);
  readonly modificaPersonaggio = output<void>();
  readonly rifaiTest = output<void>();

  protected readonly sezione = signal<Sezione>('oggi');
  protected readonly sezioni: { id: Sezione; nome: string }[] = [
    { id: 'oggi', nome: 'Oggi' },
    { id: 'abitudini', nome: 'Abitudini' },
    { id: 'sfide', nome: 'Sfide' },
    { id: 'diario', nome: 'Diario' },
    { id: 'profilo', nome: 'Profilo' },
  ];

  protected readonly regole = { MALUS_MISSIONE, MALUS_RICADUTA, MALUS_GIORNO_SALTATO };
  protected readonly ricadute = RICADUTE;
  protected readonly umori = [
    { valore: 1, nome: 'Male' },
    { valore: 2, nome: 'Così così' },
    { valore: 3, nome: 'Normale' },
    { valore: 4, nome: 'Bene' },
    { valore: 5, nome: 'Alla grande' },
  ];

  protected readonly bonusSerie = computed(() => Math.round((moltiplicatoreSerie(this.giocatore.serie()) - 1) * 100));
  protected readonly dataOggi = computed(() =>
    new Date(this.giocatore.oggi() + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  /** Le missioni di oggi, con quello che serve per mostrarle. */
  protected readonly missioni = computed(() => {
    const giorno = this.giocatore.giorno();
    if (!giorno) return [];
    const molt = moltiplicatoreSerie(this.giocatore.serie());
    return giorno.missioni
      .map((id) => MISSIONI.find((m) => m.id === id))
      .filter((m): m is Missione => !!m)
      .map((m) => {
        const c = CARATTERISTICHE.find((x) => x.id === m.caratteristica)!;
        const fatta = giorno.fatte.includes(m.id);
        return {
          ...m,
          gruppo: c.gruppo,
          caratteristica: c.nome,
          fatta,
          xp: fatta ? giorno.xp[m.id] : Math.round(XP_MISSIONE[m.difficolta] * molt),
        };
      });
  });
  protected readonly fatteOggi = computed(() => this.missioni().filter((m) => m.fatta).length);

  protected readonly sfide = computed(() => {
    const c = this.giocatore.carriera();
    const oggi = this.giocatore.oggi();
    return SFIDE.map((s) => {
      const [fatto, obiettivo] = s.avanzamento(c, oggi);
      return { ...s, fatto: Math.min(fatto, obiettivo), obiettivo, completa: fatto >= obiettivo, riscattata: sfidaRiscattata(c, oggi, s.id) };
    });
  });

  protected readonly diario = computed(() =>
    [...this.giocatore.carriera().diario]
      .reverse()
      .slice(0, 100)
      .map((v) => ({
        ...v,
        quando: new Date(v.data + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      })),
  );

  protected ricadutaOggi(id: string) {
    return this.giocatore.giorno()?.ricadute.includes(id) ?? false;
  }

  /** Scarica una copia del salvataggio. */
  protected esporta() {
    const blob = new Blob([this.giocatore.esporta()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `irl-rpg-${this.giocatore.oggi()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected readonly erroreImport = signal('');

  protected async importa(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 3_000_000 || !this.giocatore.importa(await file.text())) {
      this.erroreImport.set('Questo file non è un salvataggio valido di IRL RPG.');
    } else {
      this.erroreImport.set('');
    }
  }

  protected ricomincia() {
    if (confirm('Cancellare personaggio, test e carriera e ricominciare da zero? Esporta prima una copia se vuoi tenerla.')) {
      this.giocatore.ricomincia();
    }
  }
}
