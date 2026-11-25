import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Aspetto, NESSUNO, PELLE_RIFERIMENTO, TONI_PELLE } from './aspetto';
import { Capo, Catalogo, catalogo } from './catalogo';
import { Sesso, influenzeMorph, parametroPeso } from './corpo';
import { materialeCapo, materialeCorpo } from './materiali';
import { POSE, Rotazione, rotazioniPosa } from './pose';

const CARTELLA = 'modelli/';
const CAPELLI_SE_ORIGINALE = '#2a1d14';
/** three.js toglie alcuni caratteri dai nomi dei nodi (es. "upperarm01.L" → "upperarm01L"). */
const nomeOsso = (nome: string) => THREE.PropertyBinding.sanitizeNodeName(nome);
/** Le parti del corpo che si possono muovere a mano, con il loro nome. */
const PARTI: Record<string, string> = {
  head: 'Testa', neck01: 'Collo', spine01: 'Petto', spine03: 'Busto', spine05: 'Vita',
  'upperarm01.L': 'Braccio sinistro', 'lowerarm01.L': 'Avambraccio sinistro', 'wrist.L': 'Mano sinistra',
  'upperarm01.R': 'Braccio destro', 'lowerarm01.R': 'Avambraccio destro', 'wrist.R': 'Mano destra',
  'upperleg01.L': 'Coscia sinistra', 'lowerleg01.L': 'Gamba sinistra', 'foot.L': 'Piede sinistro',
  'upperleg01.R': 'Coscia destra', 'lowerleg01.R': 'Gamba destra', 'foot.R': 'Piede destro',
};
const PARTI_PER_OSSO = new Map(Object.entries(PARTI).map(([n, nome]) => [THREE.PropertyBinding.sanitizeNodeName(n), nome]));

/** Rotazioni scelte a mano: per ogni osso un quaternione [x, y, z, w] rispetto alla posa di partenza. */
export type PosaLibera = Record<string, number[]>;

const ASSI = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/** Uno scheletro in uso (del corpo o di un capo), con le matrici inverse originali del file. */
interface Legame {
  scheletro: THREE.Skeleton;
  inverseOriginali: THREE.Matrix4[];
}

interface Pezzo {
  radice: THREE.Object3D;
  mesh: THREE.SkinnedMesh;
  legame?: Legame;
  colora?: (colore: string) => void;
  texture?: (url: string) => void;
}

/** Il corpo di un sesso, con il suo scheletro e le posizioni delle ossa per ogni forma. */
interface Corpo extends Pezzo {
  ossa: Map<string, THREE.Bone>;
  radiciOssa: THREE.Bone[];
  /** Matrici del mondo delle ossa al caricamento (riposo, corpo medio). */
  mondoIniziale: Map<string, THREE.Matrix4>;
  quaternioniRiposo: Map<string, THREE.Quaternion>;
  posizioniForme: Record<string, Record<string, [number, number, number]>>;
  legami: Map<string, Legame>;
}

/**
 * Il personaggio 3D: corpo MakeHuman esportato da Blender con scheletro, più i capi scelti.
 * Ogni pezzo ha le stesse forme (morph) del corpo e usa le sue ossa, quindi segue altezza,
 * peso, muscoli e la posa. Si gira col dito o col mouse.
 */
@Component({
  selector: 'app-avatar-3d',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #tela [attr.aria-label]="'Il tuo personaggio in 3D: ' + descrizione()" role="img"></canvas>
    @if (stato() !== 'pronto') {
      <p class="stato" role="status">{{ stato() === 'errore' ? 'Modello 3D non disponibile' : 'Carico il personaggio…' }}</p>
    }
  `,
  styles: `
    :host { position: relative; display: block; min-height: 320px; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
    canvas:active { cursor: grabbing; }
    .stato { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--testo-tenue); font-size: 14px; }
  `,
})
export class Avatar3d {
  readonly aspetto = input.required<Aspetto>();
  /** Gira lentamente da solo. */
  readonly ruota = input(false);
  /** Tutto il corpo, primo piano sul viso, mezzo busto (carta), oppure libera (la muove l'utente). */
  readonly inquadratura = input<'corpo' | 'viso' | 'busto' | 'libera'>('corpo');
  readonly posa = input('naturale');
  /** Le rotazioni fatte a mano sopra la posa. */
  readonly posaLibera = input<PosaLibera>({});
  /** Se vero, un clic su una parte del corpo la seleziona e la si ruota con le maniglie. */
  readonly modificabile = input(false);
  /** Le rotazioni a mano sono cambiate (da salvare). */
  readonly posaCambiata = output<PosaLibera>();
  /** La parte del corpo selezionata (nome), o null. */
  readonly parteScelta = output<string | null>();

  protected readonly stato = signal<'carico' | 'pronto' | 'errore'>('carico');
  private readonly tela = viewChild.required<ElementRef<HTMLCanvasElement>>('tela');

  private readonly personaggio = new THREE.Group();
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly pezzi = new Map<string, Promise<Pezzo>>();
  private readonly corpi = new Map<Sesso, Promise<Corpo>>();
  private readonly texture = new Map<string, THREE.Texture>();
  private catalogo?: Catalogo;
  private controlli?: OrbitControls;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private scena?: THREE.Scene;
  private versione = 0;
  private inquadrato = false;
  private trasforma?: TransformControls;
  /** Rotazione locale di ogni osso data dalla posa di partenza (prima delle modifiche a mano). */
  private readonly quaternioniPosa = new Map<string, THREE.Quaternion>();

  protected descrizione() {
    const a = this.aspetto();
    return `${a.sesso === 'f' ? 'donna' : 'uomo'}, ${a.altezzaCm} cm, ${a.pesoKg} kg`;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.tela().nativeElement;
      const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }));
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scena = (this.scena = new THREE.Scene());
      const camera = (this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50));
      camera.position.set(0.6, 1.2, 4.6);

      // Luce da studio: principale calda, riempimento freddo, controluce verde del tema.
      scena.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1d24, 1.15));
      const chiave = new THREE.DirectionalLight(0xfff1e0, 2.5);
      chiave.position.set(2.5, 4, 3);
      chiave.castShadow = true;
      chiave.shadow.mapSize.set(1024, 1024);
      chiave.shadow.camera.near = 1;
      chiave.shadow.camera.far = 12;
      chiave.shadow.radius = 4;
      scena.add(chiave);
      const riempimento = new THREE.DirectionalLight(0xb8cfff, 0.9);
      riempimento.position.set(-3, 2, 2);
      scena.add(riempimento);
      const controluce = new THREE.DirectionalLight(0xc2f85a, 0.9);
      controluce.position.set(-1, 3, -3);
      scena.add(controluce);

      const pavimento = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
      pavimento.rotation.x = -Math.PI / 2;
      pavimento.receiveShadow = true;
      scena.add(pavimento);
      scena.add(this.personaggio);

      const controlli = (this.controlli = new OrbitControls(camera, canvas));
      controlli.enablePan = false;
      controlli.enableDamping = true;
      controlli.minPolarAngle = Math.PI * 0.15;
      controlli.maxPolarAngle = Math.PI * 0.6;

      // Posa a mano: clic su una parte del corpo, poi si ruota con le maniglie.
      const trasforma = (this.trasforma = new TransformControls(camera, canvas));
      trasforma.setMode('rotate');
      trasforma.setSpace('local');
      trasforma.setSize(0.7);
      scena.add(trasforma.getHelper());
      trasforma.addEventListener('dragging-changed', (e) => (controlli.enabled = !e.value));
      trasforma.addEventListener('objectChange', () => this.salvaRotazione());
      let giu: { x: number; y: number } | null = null;
      canvas.addEventListener('pointerdown', (e) => (giu = { x: e.clientX, y: e.clientY }));
      canvas.addEventListener('pointerup', (e) => {
        // Un clic (non un trascinamento della telecamera) seleziona la parte del corpo.
        if (giu && this.modificabile() && !trasforma.dragging && Math.hypot(e.clientX - giu.x, e.clientY - giu.y) < 5) {
          this.scegliParte(e);
        }
        giu = null;
      });

      catalogo()
        .then((c) => {
          this.catalogo = c;
          return this.aggiorna();
        })
        .catch(() => this.stato.set('errore'));

      const ridimensiona = () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        this.inquadra();
      };
      const osservatore = new ResizeObserver(ridimensiona);
      osservatore.observe(canvas);
      ridimensiona();

      const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
      renderer.setAnimationLoop(() => {
        controlli.autoRotate = this.ruota() && !fermo;
        controlli.autoRotateSpeed = 1.2;
        controlli.update();
        renderer.render(scena, camera);
      });

      destroyRef.onDestroy(() => {
        osservatore.disconnect();
        trasforma.dispose();
        renderer.setAnimationLoop(null);
        controlli.dispose();
        renderer.dispose();
        scena.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
          }
        });
        this.texture.forEach((t) => t.dispose());
      });
    });

    effect(() => {
      this.aspetto();
      this.posa();
      if (this.catalogo) void this.aggiorna();
    });
    effect(() => {
      this.inquadratura();
      this.inquadra();
    });
    effect(() => {
      this.posaLibera();
      if (this.catalogo && !this.trasforma?.dragging) void this.aggiorna();
    });
    effect(() => {
      if (!this.modificabile()) this.deseleziona();
    });
  }

  /** Toglie la selezione della parte del corpo. */
  deseleziona() {
    this.trasforma?.detach();
    this.parteScelta.emit(null);
  }

  /** Seleziona la parte del corpo sotto il puntatore (l'osso che più muove quel punto). */
  private scegliParte(e: PointerEvent) {
    if (!this.camera || !this.trasforma) return;
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const puntatore = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const raggio = new THREE.Raycaster();
    raggio.setFromCamera(puntatore, this.camera);
    const colpo = raggio.intersectObject(this.personaggio, true).find((c) => c.object instanceof THREE.SkinnedMesh && c.face);
    if (!colpo) return this.deseleziona();

    const mesh = colpo.object as THREE.SkinnedMesh;
    const indici = mesh.geometry.getAttribute('skinIndex');
    const pesi = mesh.geometry.getAttribute('skinWeight');
    const totali = new Map<number, number>();
    for (const v of [colpo.face!.a, colpo.face!.b, colpo.face!.c]) {
      for (let k = 0; k < 4; k++) {
        const i = indici.getComponent(v, k);
        totali.set(i, (totali.get(i) ?? 0) + pesi.getComponent(v, k));
      }
    }
    const migliore = [...totali.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    let osso: THREE.Object3D | null = migliore === undefined ? null : mesh.skeleton.bones[migliore];
    // Dalle ossa piccole (dita, viso, seconda metà di braccio o coscia) si risale alla parte principale.
    while (osso && !PARTI_PER_OSSO.has(osso.name)) osso = osso.parent instanceof THREE.Bone ? osso.parent : null;
    if (!osso) return this.deseleziona();
    this.trasforma.attach(osso);
    this.parteScelta.emit(PARTI_PER_OSSO.get(osso.name)!);
  }

  /** Dopo una rotazione a mano: la differenza dalla posa di partenza, per salvarla. */
  private salvaRotazione() {
    const osso = this.trasforma?.object;
    const partenza = osso && this.quaternioniPosa.get(osso.name);
    if (!osso || !partenza) return;
    const differenza = partenza.clone().invert().multiply(osso.quaternion);
    this.posaCambiata.emit({ ...this.posaLibera(), [osso.name]: differenza.toArray().map((n) => Math.round(n * 1e4) / 1e4) });
  }

  /** Un'immagine PNG di quello che si vede adesso (per la copertina). */
  foto(): string {
    if (!this.renderer || !this.scena || !this.camera) return '';
    // Le maniglie della posa non devono finire nella foto.
    const maniglie = this.trasforma?.getHelper();
    const visibili = maniglie?.visible ?? false;
    if (maniglie) maniglie.visible = false;
    this.renderer.render(this.scena, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    if (maniglie) maniglie.visible = visibili;
    return url;
  }

  /** Mostra i pezzi giusti per l'aspetto attuale (caricandoli se serve), li deforma e li mette in posa. */
  private async aggiorna() {
    const a = this.aspetto();
    const c = this.catalogo![a.sesso];
    const versione = ++this.versione;

    const trova = (lista: Capo[], id: string) => (id === NESSUNO ? undefined : lista.find((x) => x.id === id));
    const sopracciglia = trova(c.sopracciglia, a.sopracciglia) ?? c.sopracciglia[0];
    const capelli = trova(c.capelli, a.capelli);
    const completo = trova(c.completi, a.completo);
    const maglia = completo ? undefined : trova(c.maglie, a.maglia);
    const pantaloni = completo ? undefined : trova(c.pantaloni, a.pantaloni);
    const scarpe = trova(c.scarpe, a.scarpe);
    const cappello = trova(c.cappelli, a.cappello);
    const occhiali = trova(c.occhiali, a.occhiali);
    // Strato di ogni capo: più alto = più esterno (i pantaloni sotto la maglia, il cappello sopra i capelli).
    const strati = new Map<Capo | undefined, number>([
      [pantaloni, 1], [scarpe, 1], [maglia, 2], [completo, 2], [capelli, 2], [cappello, 3], [occhiali, 3],
    ]);
    const scelti = [c.occhi, c.ciglia, sopracciglia, capelli, completo, maglia, pantaloni, scarpe, cappello, occhiali]
      .filter((x): x is Capo => !!x);

    let corpo: Corpo;
    let pezzi: Pezzo[];
    try {
      corpo = await this.corpo(a.sesso, c.corpo, c.ossa);
      pezzi = await Promise.all(scelti.map((capo) => this.pezzo(capo, strati.get(capo) ?? 0)));
    } catch {
      if (versione === this.versione) this.stato.set('errore');
      return;
    }
    if (versione !== this.versione) return; // nel frattempo è cambiato qualcosa

    this.personaggio.clear();
    this.personaggio.add(corpo.radice);
    pezzi.forEach((p, i) => {
      this.personaggio.add(p.radice);
      p.legame ??= this.lega(corpo, p, scelti[i].file);
    });

    // Pelle, cuoio capelluto e pelle nascosta sotto i capi.
    // Tono di pelle: uno dei toni pronti, oppure un colore scelto a mano sulla pelle chiara.
    const libero = a.pelle.startsWith('#');
    const tono = TONI_PELLE.find((t) => t.id === a.pelle) ?? TONI_PELLE[1];
    const pelle = c.pelli.find((p) => p.id.includes(libero ? 'caucasian' : tono.texture)) ?? c.pelli[0];
    const materiale = corpo.mesh.material as THREE.MeshStandardMaterial;
    const mappa = this.carica(CARTELLA + pelle.texture);
    if (materiale.map !== mappa) {
      materiale.map = mappa;
      materiale.needsUpdate = true;
    }
    const opzioni = corpo.mesh.userData['opzioni'] as ReturnType<typeof materialeCorpo>['opzioni'];
    if (libero) {
      const scelto = new THREE.Color(a.pelle);
      const riferimento = new THREE.Color(PELLE_RIFERIMENTO);
      opzioni.tono.setRGB(scelto.r / riferimento.r, scelto.g / riferimento.g, scelto.b / riferimento.b);
    } else {
      opzioni.tono.setRGB(tono.fattore[0], tono.fattore[1], tono.fattore[2]);
    }
    opzioni.capelli.set(a.coloreCapelli || CAPELLI_SE_ORIGINALE);
    let bit1 = 0;
    let bit2 = 0;
    for (const capo of [completo, maglia, pantaloni, scarpe, cappello]) {
      if (capo?.bitNascosto === undefined) continue;
      if (capo.bitNascosto < 24) bit1 |= 1 << capo.bitNascosto;
      else bit2 |= 1 << (capo.bitNascosto - 24);
    }
    opzioni.nascondi1.value = bit1;
    opzioni.nascondi2.value = bit2;

    // Colori dei capi ("" = colore originale della texture).
    const colori = new Map<Capo | undefined, string>([
      [capelli, a.coloreCapelli],
      [sopracciglia, a.coloreCapelli],
      [completo, a.coloreCompleto],
      [maglia, a.coloreMaglia],
      [pantaloni, a.colorePantaloni],
      [scarpe, a.coloreScarpe],
      [cappello, a.coloreCappello],
    ]);
    scelti.forEach((capo, i) => {
      if (colori.has(capo)) pezzi[i].colora?.(colori.get(capo)!);
    });
    const iride = c.iridi.find((x) => x.id === a.occhi) ?? c.iridi[0];
    pezzi[0].texture?.(CARTELLA + iride.texture);
    pezzi[0].colora?.(a.coloreOcchi);

    // Forme, ossa e posa.
    const influenze = influenzeMorph(a);
    for (const p of [corpo, ...pezzi]) {
      const m = p.mesh;
      if (!m.morphTargetDictionary) continue;
      for (const [nome, i] of Object.entries(m.morphTargetDictionary)) m.morphTargetInfluences![i] = influenze[nome] ?? 0;
    }
    this.mettiInPosa(corpo, influenze, [corpo.legami.get('corpo')!, ...pezzi.map((p) => p.legame!)]);

    this.stato.set('pronto');
    this.inquadra();
  }

  /** Carica il corpo di un sesso, con scheletro e posizioni delle ossa. */
  private corpo(sesso: Sesso, file: string, ossa: string): Promise<Corpo> {
    let promessa = this.corpi.get(sesso);
    if (!promessa) {
      promessa = Promise.all([
        this.loader.loadAsync(CARTELLA + file),
        fetch(CARTELLA + ossa).then((r) => r.json() as Promise<Corpo['posizioniForme']>),
      ]).then(([gltf, grezze]) => {
        const posizioniForme: Corpo['posizioniForme'] = {};
        for (const [forma, ossaForma] of Object.entries(grezze)) {
          posizioniForme[forma] = Object.fromEntries(Object.entries(ossaForma).map(([n, p]) => [nomeOsso(n), p]));
        }
        const mesh = this.primaSkinnedMesh(gltf.scene);
        const { materiale, opzioni } = materialeCorpo();
        mesh.material = materiale;
        mesh.userData['opzioni'] = opzioni;
        mesh.castShadow = true;
        mesh.frustumCulled = false;

        gltf.scene.updateMatrixWorld(true);
        const ossaMappa = new Map(mesh.skeleton.bones.map((b) => [b.name, b]));
        const radiciOssa = mesh.skeleton.bones.filter((b) => !(b.parent instanceof THREE.Bone));
        const legameCorpo: Legame = { scheletro: mesh.skeleton, inverseOriginali: mesh.skeleton.boneInverses.map((m) => m.clone()) };
        return {
          radice: gltf.scene,
          mesh,
          ossa: ossaMappa,
          radiciOssa,
          mondoIniziale: new Map(mesh.skeleton.bones.map((b) => [b.name, b.matrixWorld.clone()])),
          quaternioniRiposo: new Map(mesh.skeleton.bones.map((b) => [b.name, b.quaternion.clone()])),
          posizioniForme,
          legami: new Map([['corpo', legameCorpo]]),
        };
      });
      this.corpi.set(sesso, promessa);
    }
    return promessa;
  }

  /** Carica un capo una volta sola, con il suo materiale. */
  private pezzo(capo: Capo, strato = 0): Promise<Pezzo> {
    let promessa = this.pezzi.get(capo.file);
    if (!promessa) {
      promessa = this.loader.loadAsync(CARTELLA + capo.file).then((gltf) => {
        const mesh = this.primaSkinnedMesh(gltf.scene);
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        const tex = capo.texture ? this.carica(CARTELLA + capo.texture) : null;
        const trasparenza = capo.id === 'occhi' ? 'ritaglio' : capo.trasparente ? 'sfumata' : 'nessuna';
        const { materiale, colora } = materialeCapo(tex, trasparenza, strato, capo.id === 'occhi');
        mesh.material = materiale;
        if (capo.trasparente) mesh.renderOrder = 1;
        return {
          radice: gltf.scene,
          mesh,
          colora,
          texture: (url: string) => {
            materiale.map = this.carica(url);
            materiale.needsUpdate = true;
          },
        };
      });
      this.pezzi.set(capo.file, promessa);
    }
    return promessa;
  }

  /** Aggancia un capo alle ossa del corpo (stessi nomi), tenendo le sue matrici inverse. */
  private lega(corpo: Corpo, pezzo: Pezzo, chiave: string): Legame {
    const ossa = pezzo.mesh.skeleton.bones.map((b) => corpo.ossa.get(b.name) ?? b);
    const inverseOriginali = pezzo.mesh.skeleton.boneInverses.map((m) => m.clone());
    const scheletro = new THREE.Skeleton(ossa, inverseOriginali.map((m) => m.clone()));
    pezzo.mesh.bind(scheletro, pezzo.mesh.bindMatrix);
    const legame = { scheletro, inverseOriginali };
    corpo.legami.set(chiave, legame);
    return legame;
  }

  /**
   * Sposta le ossa dove stanno in questa corporatura (mescolando le forme come i morph),
   * aggiorna il legame ossa-pelle a riposo e poi ruota le ossa nella posa scelta.
   */
  private mettiInPosa(corpo: Corpo, influenze: Record<string, number>, legami: Legame[]) {
    const base = corpo.posizioniForme['base'];
    const posizione = (nome: string) => {
      const b = base[nome];
      const p = new THREE.Vector3(b[0], b[1], b[2]);
      for (const [forma, peso] of Object.entries(influenze)) {
        const f = corpo.posizioniForme[forma]?.[nome];
        if (f && peso) p.add(new THREE.Vector3(f[0] - b[0], f[1] - b[1], f[2] - b[2]).multiplyScalar(peso));
      }
      return p;
    };

    // 1. Riposo con le ossa al posto giusto (dal padre ai figli).
    corpo.radice.updateMatrixWorld(true);
    const riposo = (osso: THREE.Bone) => {
      osso.quaternion.copy(corpo.quaternioniRiposo.get(osso.name)!);
      if (base[osso.name]) osso.position.copy(osso.parent!.worldToLocal(posizione(osso.name)));
      osso.updateMatrix();
      osso.matrixWorld.multiplyMatrices(osso.parent!.matrixWorld, osso.matrix);
      osso.children.forEach((f) => f instanceof THREE.Bone && riposo(f));
    };
    corpo.radiciOssa.forEach(riposo);

    // 2. Legame ossa-pelle: inversa nuova = (mondo nuovo)⁻¹ · mondo iniziale · inversa originale.
    for (const { scheletro, inverseOriginali } of legami) {
      scheletro.bones.forEach((osso, i) => {
        const iniziale = corpo.mondoIniziale.get(osso.name);
        if (!iniziale) return;
        scheletro.boneInverses[i].copy(osso.matrixWorld).invert().multiply(iniziale).multiply(inverseOriginali[i]);
      });
    }

    // 3. Posa: rotazioni negli assi del mondo, dal padre ai figli. Ogni osso ruota a partire
    //    da dove l'ha portato il padre (es. prima si abbassa il braccio, poi si piega il gomito).
    const posa = POSE.find((p) => p.id === this.posa()) ?? POSE[0];
    const rotazioni = Object.fromEntries(Object.entries(rotazioniPosa(posa)).map(([n, r]) => [nomeOsso(n), r]));
    // Con più peso o più muscoli le braccia restano un po' più aperte, per non entrare nei fianchi.
    const a = this.aspetto();
    const apertura = Math.max(0, parametroPeso(a.pesoKg, a.altezzaCm) - 0.5) * 28 + Math.max(0, a.muscoli - 0.5) * 12;
    const ordinati: THREE.Bone[] = [];
    corpo.radiciOssa.forEach((r) => r.traverse((o) => o instanceof THREE.Bone && ordinati.push(o)));
    for (const osso of ordinati) {
      const lista = rotazioni[osso.name];
      if (!lista) continue;
      const r = new THREE.Quaternion();
      for (const [asse, gradi] of lista as Rotazione[]) {
        let g = gradi;
        // Solo per le braccia abbassate lungo i fianchi.
        if (osso.name === nomeOsso('upperarm01.L') && asse === 'z' && g < 0 && g > -60) g += apertura;
        if (osso.name === nomeOsso('upperarm01.R') && asse === 'z' && g > 0 && g < 60) g -= apertura;
        r.premultiply(new THREE.Quaternion().setFromAxisAngle(ASSI[asse], THREE.MathUtils.degToRad(g)));
      }
      const padre = osso.parent!.getWorldQuaternion(new THREE.Quaternion());
      // locale = P⁻¹ · R · P · locale di riposo (P = padre già in posa)
      osso.quaternion
        .copy(padre)
        .invert()
        .multiply(r)
        .multiply(padre)
        .multiply(corpo.quaternioniRiposo.get(osso.name)!);
      osso.updateMatrixWorld(true);
    }

    // 4. Rotazioni fatte a mano, sopra la posa di partenza.
    this.quaternioniPosa.clear();
    for (const osso of ordinati) this.quaternioniPosa.set(osso.name, osso.quaternion.clone());
    for (const [nome, q] of Object.entries(this.posaLibera())) {
      const osso = corpo.ossa.get(nome);
      if (osso && q.length === 4) osso.quaternion.multiply(new THREE.Quaternion(q[0], q[1], q[2], q[3]).normalize());
    }
    corpo.radice.updateMatrixWorld(true);
  }

  private primaSkinnedMesh(radice: THREE.Object3D): THREE.SkinnedMesh {
    let mesh: THREE.SkinnedMesh | undefined;
    radice.traverse((o) => {
      if (!mesh && o instanceof THREE.SkinnedMesh) mesh = o;
    });
    if (!mesh) throw new Error('Modello senza scheletro');
    return mesh;
  }

  private carica(url: string): THREE.Texture {
    let t = this.texture.get(url);
    if (!t) {
      t = this.textureLoader.load(url);
      t.flipY = false; // convenzione glTF per le UV
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      this.texture.set(url, t);
    }
    return t;
  }

  /** La telecamera guarda a metà del corpo (o al viso), qualunque sia l'altezza. */
  private inquadra() {
    // In modalità libera si inquadra solo la prima volta: poi la telecamera la muove l'utente.
    if (!this.controlli || !this.camera || (this.inquadratura() === 'libera' && this.inquadrato)) return;
    if (this.stato() === 'pronto') this.inquadrato = true;
    const altezza = this.aspetto().altezzaCm / 100;
    const viso = this.inquadratura() === 'viso';
    const busto = this.inquadratura() === 'busto';
    const tangente = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    let centro: number;
    let distanza: number;
    if (viso) {
      centro = altezza * 0.93;
      distanza = Math.max(0.9, 0.16 / tangente / Math.min(1, this.camera.aspect));
    } else if (busto) {
      // Mezzo busto, come sulle carte dei calciatori: dalla vita in su, di fronte.
      centro = altezza * 0.8;
      distanza = Math.max((altezza * 0.24) / tangente, (altezza * 0.22) / (tangente * this.camera.aspect));
    } else {
      centro = altezza * 0.55;
      distanza = Math.max((altezza * 0.66) / tangente, (altezza * 0.4) / (tangente * this.camera.aspect));
    }
    // Il mezzo busto è sempre frontale; le altre inquadrature tengono la direzione scelta dall'utente.
    const direzione = busto
      ? new THREE.Vector3(0, 0, 1)
      : this.camera.position.clone().sub(this.controlli.target).setY(0).normalize();
    this.controlli.target.set(0, centro, 0);
    this.camera.position.set(direzione.x * distanza, centro + (viso || busto ? 0.03 : 0.1), direzione.z * distanza);
    this.controlli.minDistance = viso ? 0.5 : 1.2;
    this.controlli.maxDistance = Math.max(7, distanza * 1.5);
  }
}
