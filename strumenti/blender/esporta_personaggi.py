"""
Esporta i personaggi di IRL RPG da Blender con MPFB (MakeHuman).

Per ogni sesso:
1. crea il corpo in 11 forme: la griglia 3×3 di peso × muscoli di MakeHuman (altezza media)
   più il corpo più basso e quello più alto, e salva dove stanno le ossa in ogni forma;
2. in ogni forma adatta al corpo (con il fitting di MakeHuman) occhi, ciglia, sopracciglia,
   capelli, completi, maglie, pantaloni, scarpe, cappelli e occhiali;
3. salva corpo e capi come GLB separati, ognuno con lo scheletro (per le pose nell'app) e con
   le forme come morph target, così seguono altezza, peso e muscoli;
4. scrive `catalogo.json`, `ossa-<sesso>.json`, `crediti.json` e l'elenco delle texture e
   delle anteprime da convertire.

Uso:
  blender --background --python esporta_personaggi.py -- <asset di sistema> <cartella pacchetti> <uscita>
"""
import bpy, json, sys
from pathlib import Path
from mathutils.bvhtree import BVHTree
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

argomenti = sys.argv[sys.argv.index("--") + 1:]
SISTEMA, PACCHETTI, USCITA = Path(argomenti[0]), Path(argomenti[1]), Path(argomenti[2])
for g in ("m", "f"):
    (USCITA / g).mkdir(parents=True, exist_ok=True)

GENERI = {"m": 1.0, "f": 0.0}
# Corpo femminile con misure sobrie: il default di MakeHuman è troppo accentuato.
MACRO_EXTRA = {"m": {}, "f": {"cupsize": 0.35, "firmness": 0.5}}

# Le forme: (peso, muscoli, altezza). "base" è il corpo di partenza dei morph.
FORME = {"base": (0.5, 0.5, 0.5)}
for ip, p in enumerate((0.0, 0.5, 1.0)):
    for im, m in enumerate((0.0, 0.5, 1.0)):
        if (ip, im) != (1, 1):
            FORME[f"peso{ip}_muscoli{im}"] = (p, m, 0.5)
FORME["altezza0"] = (0.5, 0.5, 0.0)
FORME["altezza2"] = (0.5, 0.5, 1.0)

# Catalogo: id -> (nome, sessi). I capi dei pacchetti si cercano per nome della cartella.
CAPELLI = {
    "short02": "Corti", "short01": "Corti spettinati", "short03": "Corti con riga", "short04": "Corti all'indietro",
    "cortu_short_messy_hair": "Corti mossi", "culturalibre_hair_02": "Corti con ciuffo", "culturalibre_hair_05": "Spettinati",
    "culturalibre_hair_14": "Corti scalati", "afro01": "Afro", "punkduck_alpha7_curly": "Ricci",
    "bob01": "Caschetto", "bob02": "Caschetto liscio", "littleright_bobcut_hair": "Caschetto corto",
    "toigo_blunt_bob": "Caschetto netto", "toigo_curled_under_bob": "Caschetto bombato",
    "toigo_inverted_bob": "Caschetto asimmetrico", "o4saken_chinesebob01": "Caschetto con frangia",
    "ponytail01": "Coda", "culturalibre_hair_13": "Codino mosso", "rehmanpolanski_hair_bun_brown": "Chignon",
    "elvs_reverse_french_braid_bun": "Chignon intrecciato", "braid01": "Treccia", "elvs_french_braid_variation": "Treccia francese",
    "long01": "Lunghi", "culturalibre_hair_01": "Lunghi lisci", "o4saken_long01": "Lunghi con riga",
    "punkduck_alpha7_long": "Lunghi mossi", "faydaen_hair_1": "Mossi",
}
MF, M, F = ("m", "f"), ("m",), ("f",)
COMPLETI = {
    "male_casualsuit04": ("T-shirt e jeans", M), "male_casualsuit06": ("T-shirt bianca e jeans", M),
    "male_casualsuit02": ("Maglia e jeans", M), "male_casualsuit01": ("Camicia e jeans", M),
    "male_casualsuit03": ("Camicia a quadri e jeans", M), "male_casualsuit05": ("Giacca e jeans", M),
    "male_elegantsuit01": ("Abito elegante", M), "male_worksuit01": ("Salopette da lavoro", M),
    "female_casualsuit01": ("T-shirt e jeans", F), "female_sportsuit01": ("Felpa e leggings", F),
    "female_elegantsuit01": ("Camicia e gonna", F),
}
MAGLIE = {
    "elvs_crude_t-shirt_male": ("T-shirt bianca", M), "joepal_crude_t-shirt_female": ("T-shirt bianca", F),
    "toigo_basic_tucked_t-shirt": ("T-shirt grigia", MF), "elvs_male_logo_tshirt1": ("T-shirt nera", M),
    "elvs_male_muscle_shirt1": ("T-shirt aderente", M), "drednicolson_short-tail_camo_tee": ("T-shirt militare", MF),
    "namuhekam_male_polo_shirt": ("Polo", MF), "toigo_fisherman_sweater": ("Maglione", MF),
    "mindfront_tank_top_01": ("Canotta", M),
    "elvs_ladies_tank1": ("Canotta", F), "elvs_ruffle_sleeve_peasant_blouse_1": ("Blusa", F),
    "punkduck_sleeveless_shirt": ("Camicia smanicata", F),
}
PANTALONI = {
    "cortu_cargo_pants": ("Cargo", MF), "toigo_wool_pants": ("Pantaloni di lana", MF),
    "elvs_male_trouser_short_1": ("Bermuda", M), "elvs_male_trouser_short_2": ("Bermuda con catena", M),
    "punkduck_female_short_jeans": ("Shorts di jeans", F), "toigo_long_full_skirt": ("Gonna lunga", F),
    "toigo_tiered_skirt": ("Gonna a balze", F), "toigo_skirt_with_lace_ruffle": ("Gonna con pizzo", F),
}
SCARPE = {
    "shoes05": ("Sneakers bianche", MF), "shoes06": ("Sneakers blu", MF), "shoes02": ("Sneakers mimetiche", MF),
    "shoes04": ("Scarpe nere", MF), "shoes01": ("Scarpe eleganti", MF), "toigo_mj_cloth_shoes": ("Slip-on", MF),
    "toigo_ankle_boots_male": ("Stivaletti", M), "toigo_ankle_boots_female": ("Stivaletti", F),
    "mindfront_shoes_biker_boots_male": ("Anfibi", M), "mindfront_shoes_biker_boots_female": ("Anfibi", F),
    "maciekg_leather_boots": ("Stivali di pelle", M), "scailman_low-heeled_boots": ("Stivali", F),
    "toigo_flats": ("Ballerine", F), "punkduck_winter_boots": ("Stivali invernali", MF), "shoes03": ("Stivali neri", MF),
}
CAPPELLI = {
    "jujube_newsboy_cap": ("Coppola", MF), "aethelraed_unraed_cloche_hat": ("Pescatora", MF),
    "fedora01": ("Fedora", MF), "fedora_cocked": ("Fedora inclinato", MF),
}
OCCHIALI = {
    "kwnet_at_optical_glasses": ("Da vista", MF), "spamrakuen_tbm_glasses_frames_01": ("Montatura nera", MF),
    "spamrakuen_sagerfrogs_glasses_04": ("Montatura sottile", MF), "toigo_round_glasses_leopard": ("Tondi", MF),
    "frankyaye_glasses_library_male": ("Da sole", MF),
}
SOPRACCIGLIA = {f"eyebrow{i:03d}": f"Stile {i}" for i in range(1, 13)}
CIGLIA = {"m": "eyelashes01", "f": "eyelashes02"}
PELLI = {"m": ("young_caucasian_male", "young_asian_male", "young_african_male"),
         "f": ("young_caucasian_female", "young_asian_female", "young_african_female")}
IRIDI = {"brown": "Marroni", "brownlight": "Nocciola", "green": "Verdi", "bluegreen": "Verde-azzurri",
         "blue": "Azzurri", "deepblue": "Blu", "lightblue": "Celesti", "grey": "Grigi", "ice": "Ghiaccio"}

# Dove cercare le cartelle dei capi.
CARTELLE = {}
for radice in [SISTEMA, *sorted(p for p in PACCHETTI.iterdir() if p.is_dir())]:
    for mhclo in radice.rglob("*.mhclo"):
        CARTELLE.setdefault(mhclo.parent.name, mhclo.parent)
        CARTELLE.setdefault(mhclo.stem, mhclo.parent)


def capi(g):
    """(categoria, id, cartella, tipo MPFB, nome) di tutti i capi di quel sesso."""
    lista = [("occhi", "occhi", SISTEMA / "eyes/high-poly", "Eyes", "Occhi"),
             ("ciglia", CIGLIA[g], CARTELLE[CIGLIA[g]], "Eyelashes", "Ciglia")]
    lista += [("sopracciglia", i, CARTELLE[i], "Eyebrows", n) for i, n in SOPRACCIGLIA.items()]
    lista += [("capelli", i, CARTELLE[i], "Hair", n) for i, n in CAPELLI.items()]
    for categoria, elenco in (("completi", COMPLETI), ("maglie", MAGLIE), ("pantaloni", PANTALONI),
                              ("scarpe", SCARPE), ("cappelli", CAPPELLI), ("occhiali", OCCHIALI)):
        lista += [(categoria, i, CARTELLE[i], "Clothes", n) for i, (n, sessi) in elenco.items() if g in sessi]
    return lista


def mhclo(cartella):
    return next(cartella.glob("*.mhclo"))


def pulisci():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    for blocchi in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images):
        for b in list(blocchi):
            if b.users == 0:
                blocchi.remove(b)


def crea(g, peso, muscoli, altezza):
    info = TargetService.get_default_macro_info_dict()
    info.update({"gender": GENERI[g], "age": 0.5, "weight": peso, "muscle": muscoli, "height": altezza, **MACRO_EXTRA[g]})
    return HumanService.create_human(mask_helpers=False, feet_on_ground=True, macro_detail_dict=info)


def _valutate(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    co = [v.co.copy() for v in me.vertices]
    ev.to_mesh_clear()
    return co


def ossa(rig):
    """Posizione della testa di ogni osso, in coordinate glTF (Y in alto)."""
    risultato = {}
    for b in rig.data.bones:
        p = rig.matrix_world @ b.head_local
        risultato[b.name] = [round(p.x, 5), round(p.z, 5), round(-p.y, 5)]
    return risultato


def esporta(oggetti, percorso):
    bpy.ops.object.select_all(action="DESELECT")
    for o in oggetti:
        o.select_set(True)
    bpy.context.view_layer.objects.active = oggetti[-1]
    bpy.ops.export_scene.gltf(filepath=str(percorso), export_format="GLB", use_selection=True, export_skins=True,
                              export_def_bones=False, export_morph=True, export_morph_normal=True,
                              export_attributes=True, export_vertex_color="NONE", export_materials="PLACEHOLDER",
                              export_animations=False, export_yup=True)


def aggiungi_morph(obj, forme_obj):
    if obj.data.shape_keys is None:
        obj.shape_key_add(name="Basis")
    for nome, coords in forme_obj.items():
        if nome == "base":
            continue
        k = obj.shape_key_add(name=nome)
        for i, c in enumerate(coords):
            k.data[i].co = c


def leggi_mhmat(cartella):
    """(texture di colore, autore, licenza) dal materiale e dal mhclo del capo."""
    texture = autore = licenza = None
    mhmat = next(cartella.glob("*.mhmat"), None)
    if mhmat:
        for riga in mhmat.read_text(encoding="utf-8", errors="ignore").splitlines():
            if riga.startswith("diffuseTexture"):
                texture = cartella / Path(riga.split(None, 1)[1].strip()).name
    for riga in mhclo(cartella).read_text(encoding="utf-8", errors="ignore").splitlines():
        riga = riga.lstrip("# ").strip()  # spesso le righe sono commenti: "# author Nome"
        if riga.lower().startswith("author "):
            autore = riga.split(None, 1)[1].strip()
        if riga.lower().startswith("license "):
            licenza = riga.split(None, 1)[1].strip()
    return texture, autore, licenza


catalogo, misure, crediti = {}, {}, {}
da_convertire = []  # (sorgente, destinazione, lato massimo)

for g in GENERI:
    elenco = capi(g)
    forme, posizioni_ossa = {}, {}
    ordine = [f for f in FORME if f != "base"] + ["base"]  # "base" per ultima: resta in scena
    oggetti = {}
    for nome_forma in ordine:
        pulisci()
        umano = crea(g, *FORME[nome_forma])
        rig = HumanService.add_builtin_rig(umano, "default")
        posizioni_ossa[nome_forma] = ossa(rig)
        forme[nome_forma] = {"corpo": _valutate(umano)}
        ultima = nome_forma == "base"
        for categoria, id_capo, cartella, tipo, _ in elenco:
            ogg = HumanService.add_mhclo_asset(str(mhclo(cartella)), umano, asset_type=tipo, subdiv_levels=0,
                                               set_up_rigging=ultima, import_subrig=False, import_weights=ultima)
            forme[nome_forma][id_capo] = [v.co.copy() for v in ogg.data.vertices]
            oggetti[id_capo] = ogg
        print("FORMA", g, nome_forma, "ok", flush=True)

    # ---- Il corpo: vertici del cuoio capelluto, vertici nascosti sotto i capi, pesi delle ossa.
    nomi = {gr.index: gr.name for gr in umano.vertex_groups}
    def gruppo(v, nome):
        return next((x.weight for x in v.groups if nomi[x.group] == nome), 0.0)

    tieni = [gruppo(v, "body") > 0.5 for v in umano.data.vertices]
    umano.data.update()
    # Pelle nascosta sotto ogni capo: i vertici del gruppo "Delete" di MakeHuman, più quelli
    # da cui un raggio lungo la normale (verso fuori o verso dentro) incontra il tessuto.
    # Così la pelle non "buca" i vestiti, anche dove il gruppo "Delete" non arriva.
    bit, nascosto = {}, [0] * len(umano.data.vertices)
    # Normali del corpo nella sua forma vera (non del modello base di MakeHuman).
    provvisoria = bpy.data.meshes.new("normali")
    provvisoria.from_pydata([tuple(c) for c in forme["base"]["corpo"]], [], [list(f.vertices) for f in umano.data.polygons])
    provvisoria.update()
    normali = [v.normal.copy() for v in provvisoria.vertices]
    bpy.data.meshes.remove(provvisoria)
    for categoria, id_capo, *_ in elenco:
        if categoria not in ("completi", "maglie", "pantaloni", "scarpe", "cappelli"):
            continue
        bit[id_capo] = len(bit)
        segno = 1 << bit[id_capo]
        vg = umano.vertex_groups.get("Delete." + mhclo(CARTELLE[id_capo]).stem.replace(" ", "_"))
        if vg is not None:
            for v in umano.data.vertices:
                if any(x.group == vg.index and x.weight > 0.5 for x in v.groups):
                    nascosto[v.index] |= segno
        ogg = oggetti[id_capo]
        albero = BVHTree.FromPolygons([v.co for v in ogg.data.vertices], [list(f.vertices) for f in ogg.data.polygons])
        for i, co in enumerate(forme["base"]["corpo"]):
            if not tieni[i]:
                continue
            # Tessuto davanti alla pelle (entro 5 cm) o dietro, dove la pelle lo buca (entro 3 cm).
            if albero.ray_cast(co, normali[i], 0.05)[0] is not None or albero.ray_cast(co, -normali[i], 0.03)[0] is not None:
                nascosto[i] |= segno

    tenute = [f for f in umano.data.polygons if all(tieni[i] for i in f.vertices)]
    me = bpy.data.meshes.new("Corpo")
    me.from_pydata([tuple(c) for c in forme["base"]["corpo"]], [], [list(f.vertices) for f in tenute])
    corpo = bpy.data.objects.new("Corpo", me)
    bpy.context.collection.objects.link(corpo)
    uv_origine, uv = umano.data.uv_layers.active.data, me.uv_layers.new(name="UVMap")
    k = 0
    for f in tenute:
        for li in f.loop_indices:
            uv.data[k].uv = uv_origine[li].uv
            k += 1
    for p in me.polygons:
        p.use_smooth = True
    cuoio = me.attributes.new("_CUOIO", "FLOAT", "POINT")
    n1 = me.attributes.new("_NASCOSTO1", "FLOAT", "POINT")  # bit 0–23
    n2 = me.attributes.new("_NASCOSTO2", "FLOAT", "POINT")  # bit 24–47
    for v in umano.data.vertices:
        cuoio.data[v.index].value = gruppo(v, "scalp")
        n1.data[v.index].value = float(nascosto[v.index] & 0xFFFFFF)
        n2.data[v.index].value = float(nascosto[v.index] >> 24)
    # Pesi delle ossa copiati dal corpo di MakeHuman, così il corpo si muove con lo scheletro.
    for vg in umano.vertex_groups:
        if vg.name in rig.data.bones:
            nuovo = corpo.vertex_groups.new(name=vg.name)
            for v in umano.data.vertices:
                for x in v.groups:
                    if x.group == vg.index and x.weight > 0:
                        nuovo.add([v.index], x.weight, "REPLACE")
    aggiungi_morph(corpo, {n: f["corpo"] for n, f in forme.items()})
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = corpo
    corpo.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    corpo.parent = rig
    corpo.modifiers.new("Scheletro", "ARMATURE").object = rig
    corpo.data.materials.append(bpy.data.materials.new("corpo"))
    umano.hide_set(True)
    esporta([rig, corpo], USCITA / g / "corpo.glb")

    def altezza(c):
        zz = [c[i].z for i, t in enumerate(tieni) if t]
        return round(max(zz) - min(zz), 4)

    misure[g] = {"min": altezza(forme["altezza0"]["corpo"]), "media": altezza(forme["base"]["corpo"]),
                 "max": altezza(forme["altezza2"]["corpo"])}
    (USCITA / f"ossa-{g}.json").write_text(json.dumps(posizioni_ossa))

    # ---- I capi: ognuno il suo GLB, con scheletro e forme.
    voci = {k: [] for k in ("sopracciglia", "capelli", "completi", "maglie", "pantaloni", "scarpe", "cappelli", "occhiali")}
    for categoria, id_capo, cartella, _, nome in elenco:
        ogg = oggetti[id_capo]
        for mod in list(ogg.modifiers):
            if mod.type != "ARMATURE":
                ogg.modifiers.remove(mod)
        ogg.data.materials.clear()
        ogg.data.materials.append(bpy.data.materials.new(id_capo))
        aggiungi_morph(ogg, {n: f[id_capo] for n, f in forme.items()})
        file = f"{g}/{id_capo}.glb"
        esporta([rig, ogg], USCITA / file)

        voce = {"id": id_capo, "nome": nome, "file": file}
        texture, autore, licenza = leggi_mhmat(cartella)
        if texture and texture.exists() and categoria != "occhi":
            voce["texture"] = f"tex/{id_capo}.webp"
            da_convertire.append((str(texture), voce["texture"], 256 if categoria in ("sopracciglia", "ciglia") else 1024))
        anteprima = next(cartella.glob("*.thumb"), None)
        if anteprima and categoria not in ("occhi", "ciglia"):
            voce["anteprima"] = f"anteprime/{id_capo}.webp"
            da_convertire.append((str(anteprima), voce["anteprima"], 160))
        if categoria in ("capelli", "sopracciglia", "ciglia"):
            voce["trasparente"] = True
        if id_capo in bit:
            voce["bitNascosto"] = bit[id_capo]
        if licenza and "cc0" not in licenza.lower():
            crediti[id_capo] = {"nome": nome, "autore": autore, "licenza": licenza}
        if categoria in voci:
            voci[categoria].append(voce)
        else:
            voci[categoria] = voce
        print("CAPO", g, id_capo, flush=True)

    voci["corpo"] = f"{g}/corpo.glb"
    voci["ossa"] = f"ossa-{g}.json"
    voci["pelli"] = []
    for i in PELLI[g]:
        mhmat = next((SISTEMA / "skins" / i).glob("*.mhmat"))
        riga = next(r for r in mhmat.read_text(encoding="utf-8", errors="ignore").splitlines() if r.startswith("diffuseTexture"))
        da_convertire.append((str(mhmat.parent / Path(riga.split(None, 1)[1].strip()).name), f"tex/pelle-{i}.webp", 1024))
        voci["pelli"].append({"id": i, "texture": f"tex/pelle-{i}.webp"})
    voci["iridi"] = [{"id": i, "nome": n, "texture": f"tex/occhi-{i}.webp"} for i, n in IRIDI.items()]
    for i in IRIDI:
        da_convertire.append((str(SISTEMA / "eyes/materials" / f"{i}_eye.png"), f"tex/occhi-{i}.webp", 256))
    catalogo[g] = voci

(USCITA / "catalogo.json").write_text(json.dumps(catalogo, indent=1, ensure_ascii=False))
(USCITA / "crediti.json").write_text(json.dumps(crediti, indent=1, ensure_ascii=False))
(USCITA / "misure.json").write_text(json.dumps(misure, indent=2))
(USCITA / "da-convertire.json").write_text(json.dumps(sorted(set(map(tuple, da_convertire)))))
print("FATTO", misure, flush=True)
