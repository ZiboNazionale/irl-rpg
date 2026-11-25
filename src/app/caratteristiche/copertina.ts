import { ChangeDetectionStrategy, Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { Giocatore } from '../giocatore';
import { Avatar3d } from '../personaggio/avatar-3d';
import { POSE } from '../personaggio/pose';
import { CARATTERISTICHE, complessivo } from './caratteristiche';

/**
 * La copertina: si parte da una posa pronta, poi si clicca su una parte del corpo e la si ruota
 * con le maniglie; la telecamera si gira trascinando e si avvicina con rotella o due dita.
 * La posa resta salvata. "Salva copertina" crea un'immagine con personaggio, OVR e statistiche.
 */
@Component({
  selector: 'app-copertina',
  imports: [Avatar3d],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './copertina.html',
  styleUrl: './copertina.scss',
})
export class Copertina {
  protected readonly giocatore = inject(Giocatore);
  readonly chiudi = output<void>();
  private readonly avatar = viewChild.required(Avatar3d);

  protected readonly pose = POSE;
  protected readonly punteggi = computed(() => this.giocatore.caratteristiche()!);
  protected readonly ovr = computed(() => complessivo(this.punteggi()));
  /** Se vero, un clic su una parte del corpo la seleziona e la si ruota. */
  protected readonly muovi = signal(true);
  protected readonly parte = signal<string | null>(null);
  protected readonly hasPosaLibera = computed(() => Object.keys(this.giocatore.dati().posaLibera).length > 0);
  protected readonly migliori = computed(() =>
    CARATTERISTICHE.filter((c) => c.gruppo !== 'Mente')
      .map((c) => ({ ...c, valore: this.punteggi()[c.id] }))
      .sort((a, b) => b.valore - a.valore)
      .slice(0, 6),
  );

  /** Disegna la copertina in un'immagine PNG (personaggio + scritte) e la scarica. */
  protected async salva() {
    const foto = this.avatar().foto();
    if (!foto) return;
    const img = new Image();
    img.src = foto;
    await img.decode();
    await document.fonts.ready;

    const L = 1080;
    const A = 1350;
    const tela = document.createElement('canvas');
    tela.width = L;
    tela.height = A;
    const g = tela.getContext('2d')!;

    const sfondo = g.createLinearGradient(0, 0, 0, A);
    sfondo.addColorStop(0, '#1b2410');
    sfondo.addColorStop(0.65, '#0b0d10');
    g.fillStyle = sfondo;
    g.fillRect(0, 0, L, A);
    const luce = g.createRadialGradient(L / 2, A * 0.42, 40, L / 2, A * 0.42, L * 0.6);
    luce.addColorStop(0, 'rgba(194,248,90,0.22)');
    luce.addColorStop(1, 'rgba(194,248,90,0)');
    g.fillStyle = luce;
    g.fillRect(0, 0, L, A);

    // Il personaggio, ritagliato a riempire l'area centrale.
    const area = { x: 0, y: 60, w: L, h: A - 360 };
    const scala = Math.max(area.w / img.width, area.h / img.height);
    const w = img.width * scala;
    const h = img.height * scala;
    g.save();
    g.beginPath();
    g.rect(area.x, area.y, area.w, area.h);
    g.clip();
    g.drawImage(img, area.x + (area.w - w) / 2, area.y + (area.h - h) / 2, w, h);
    g.restore();

    const titoli = (dim: number, peso = 700) => `${peso} ${dim}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    g.fillStyle = '#c2f85a';
    g.font = titoli(190);
    g.textBaseline = 'top';
    g.fillText(String(this.ovr()), 64, 48);
    g.fillStyle = '#98a2b0';
    g.font = titoli(44, 600);
    g.fillText('OVR', 72, 230);
    g.textAlign = 'center';
    g.fillStyle = '#eef1f4';
    g.font = titoli(110);
    g.fillText(this.giocatore.dati().nome.toUpperCase(), L / 2, A - 300, L - 100);
    g.fillStyle = 'rgba(194,248,90,0.5)';
    g.fillRect(L / 2 - 160, A - 178, 320, 3);

    this.migliori().forEach((m, i) => {
      const x = L / 2 + (i % 3 - 1) * 300;
      const y = A - 150 + Math.floor(i / 3) * 64;
      g.textAlign = 'right';
      g.fillStyle = '#eef1f4';
      g.font = titoli(54);
      g.fillText(String(m.valore), x - 6, y);
      g.textAlign = 'left';
      g.fillStyle = '#98a2b0';
      g.font = titoli(44, 600);
      g.fillText(m.sigla, x + 10, y + 6);
    });

    const link = document.createElement('a');
    link.href = tela.toDataURL('image/png');
    link.download = `copertina-${this.giocatore.dati().nome.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'giocatore'}.png`;
    link.click();
  }
}
