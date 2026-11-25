# IRL RPG

La tua vita come una modalità carriera: crei un personaggio 3D con le tue misure reali e un test calcola le sue caratteristiche.

## Cosa c'è

1. **Personaggio 3D.** Un modello uomo e uno donna, generati in Blender con MPFB (MakeHuman), con scheletro. Altezza in cm, peso in kg e muscolatura deformano il corpo in tempo reale (griglia peso × muscoli di MakeHuman) e spostano le ossa di conseguenza. Si scelgono carnagione, occhi, sopracciglia, 28 capigliature con colore, completi oppure maglia e pantaloni separati, scarpe, cappelli e occhiali, con anteprime dei capi. I vestiti seguono corpo e posa, e la pelle sotto non si vede.
2. **Test delle caratteristiche.** 45 domande, una alla volta, con risposta anche dai tasti 1–5. Calcolano 15 caratteristiche da 1 a 99:
   - **Corpo:** Resistenza, Forza, Velocità, Mobilità
   - **Carriera:** Hard skill, Gestione soldi, Focus, Organizzazione
   - **Identità:** Carisma, Comunicazione, Umorismo, Creatività
   - **Mente:** Disciplina, Motivazione, Benessere
3. **Carta del giocatore.** Complessivo (OVR, media delle 12 abilità), personaggio a mezzo busto e tutte le caratteristiche, con quanto sono cambiate rispetto al test.
4. **Copertina.** Si parte da una posa pronta, poi si clicca su braccia, gambe, testa o busto e li si ruota a mano; si muove la telecamera e si salva un'immagine con personaggio, OVR e statistiche. La posa resta sulla carta.
5. **Carriera.** Ogni giorno 4 missioni nella vita reale, una per gruppo, sulle caratteristiche più deboli. Completarle dà XP (con bonus serie fino a +50%) e fa crescere le caratteristiche; le missioni non fatte, i giorni saltati e le ricadute nelle cattive abitudini tolgono XP e caratteristiche. Livelli con XP crescente, sfide settimanali, check-in giornaliero dell'umore (Benessere), diario e salvataggio esportabile.
6. **App installabile.** Funziona offline e si può aggiungere alla schermata Home (PWA).

Tutto resta nel browser: niente account e nessun dato inviato.

## Sviluppo

```bash
npm ci
npm start      # http://localhost:4200
npm test
npm run build
```

## I modelli 3D

I file in `public/modelli/` si generano dal pacchetto [MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) (CC0), con Blender e l'estensione MPFB:

```bash
blender --background --python strumenti/blender/esporta_personaggi.py -- <asset di sistema> <cartella dei pacchetti> <uscita>
node strumenti/blender/prepara_per_web.mjs <uscita> public/modelli <ffmpeg> <gltf-transform cli.js>
```

Servono il pacchetto di sistema e i pacchetti di MakeHuman per capelli, magliette, pantaloni, gonne, scarpe, cappelli e occhiali (hair01/03, shirts01/03, pants01/03, skirts01, shoes01/03, hats01, glasses01). Lo script crea per ogni sesso 11 forme del corpo (griglia 3×3 di peso e muscoli, più minima e massima altezza) e ci adatta tutti i capi. Corpo e capi diventano GLB separati con scheletro e con le forme come morph target; in più scrive `catalogo.json`, le posizioni delle ossa per ogni forma (`ossa-m.json`, `ossa-f.json`) e `crediti.json`. Il secondo script comprime i modelli (meshopt) e converte texture e anteprime in WebP. Le pose sono in `src/app/personaggio/pose.ts`.

Gli asset di MakeHuman sono in CC0, tranne alcuni capi in CC-BY: autori e licenze sono in `public/modelli/crediti.json` e nell'app, sotto "Crediti dei modelli 3D".
