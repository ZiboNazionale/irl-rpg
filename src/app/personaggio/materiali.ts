import * as THREE from 'three';

/**
 * Il materiale del corpo: texture della pelle per un fattore di tono, il cuoio capelluto
 * del colore dei capelli, e niente pelle dove la coprono i vestiti (così non "buca" il tessuto).
 * Attributi per vertice del modello:
 * - _cuoio: 1 sul cuoio capelluto;
 * - _nascosto1, _nascosto2: un bit per ogni capo che copre quel vertice (bit 0–23 e 24–47).
 */
export interface OpzioniCorpo {
  tono: THREE.Color;
  capelli: THREE.Color;
  /** I bit dei capi indossati (0–23 e 24–47): i vertici con uno di questi bit non si disegnano. */
  nascondi1: { value: number };
  nascondi2: { value: number };
}

export function materialeCorpo(): { materiale: THREE.MeshStandardMaterial; opzioni: OpzioniCorpo } {
  const opzioni: OpzioniCorpo = {
    tono: new THREE.Color(1, 1, 1),
    capelli: new THREE.Color(0x2a1d14),
    nascondi1: { value: 0 },
    nascondi2: { value: 0 },
  };
  const materiale = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });

  materiale.onBeforeCompile = (shader) => {
    shader.uniforms['u_tono'] = { value: opzioni.tono };
    shader.uniforms['u_capelli'] = { value: opzioni.capelli };
    shader.uniforms['u_nascondi1'] = opzioni.nascondi1;
    shader.uniforms['u_nascondi2'] = opzioni.nascondi2;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float _cuoio;
        attribute float _nascosto1;
        attribute float _nascosto2;
        uniform int u_nascondi1;
        uniform int u_nascondi2;
        varying float vCuoio;
        varying float vNascosto;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vCuoio = _cuoio;
        vNascosto = ((int(_nascosto1 + 0.5) & u_nascondi1) != 0 || (int(_nascosto2 + 0.5) & u_nascondi2) != 0) ? 1.0 : 0.0;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vCuoio;
        varying float vNascosto;
        uniform vec3 u_tono;
        uniform vec3 u_capelli;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vNascosto > 0.5) discard;
        diffuseColor.rgb *= u_tono;
        // Sotto i capelli il cuoio capelluto prende il loro colore (rasati o attaccatura).
        diffuseColor.rgb = mix(diffuseColor.rgb, u_capelli * 0.8, smoothstep(0.3, 0.7, vCuoio) * 0.85);`,
      );
  };

  return { materiale, opzioni };
}

/**
 * Materiale per un capo con texture (capelli, vestiti, scarpe…). Con una tinta, la texture
 * diventa in scala di grigi e prende quel colore, mantenendo pieghe e dettagli.
 */
export function materialeCapo(
  texture: THREE.Texture | null,
  trasparenza: 'nessuna' | 'ritaglio' | 'sfumata',
  strato = 0,
  /** Tinge solo le parti scure della texture (l'iride, non il bianco dell'occhio). */
  soloScuri = false,
) {
  const tinta = { value: new THREE.Color(1, 1, 1) };
  const usaTinta = { value: false };
  const materiale = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: trasparenza === 'sfumata' ? 0.75 : 0.85,
    metalness: 0,
    // "ritaglio": parti del tutto trasparenti (la cornea degli occhi);
    // "sfumata": capelli, ciglia e sopracciglia, con una trasparenza a puntini (alpha hash)
    // che tiene i peli sottili e non ha problemi di ordine di disegno.
    alphaTest: trasparenza === 'ritaglio' ? 0.5 : 0,
    alphaHash: trasparenza === 'sfumata',
    side: trasparenza === 'nessuna' ? THREE.FrontSide : THREE.DoubleSide,
    // Strati: un capo più esterno vince sugli altri dove si toccano (niente sfarfallii).
    polygonOffset: strato > 0,
    polygonOffsetFactor: -strato,
    polygonOffsetUnits: -strato * 4,
  });
  materiale.onBeforeCompile = (shader) => {
    shader.uniforms['u_tinta'] = tinta;
    shader.uniforms['u_usaTinta'] = usaTinta;
    // I capi più esterni si staccano di 2 mm per strato, così coprono quelli sotto.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <morphtarget_vertex>',
      `#include <morphtarget_vertex>
      transformed += normalize(objectNormal) * ${(strato * 0.002).toFixed(4)};`,
    );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 u_tinta;\nuniform bool u_usaTinta;`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (u_usaTinta) {
          float luce = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 tinto = u_tinta * clamp(luce * ${soloScuri ? '2.4' : '1.6'}, 0.0, 1.25);
          diffuseColor.rgb = ${soloScuri ? 'mix(tinto, diffuseColor.rgb, smoothstep(0.45, 0.7, luce))' : 'tinto'};
        }`,
      );
  };
  // Lo strato cambia lo shader: chiave di cache diversa per ogni strato.
  materiale.customProgramCacheKey = () => `capo-${strato}-${soloScuri}`;
  return {
    materiale,
    colora(colore: string) {
      usaTinta.value = colore !== '';
      if (colore) tinta.value.set(colore);
    },
  };
}
