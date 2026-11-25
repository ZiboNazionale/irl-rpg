// Dopo l'esportazione da Blender: comprime i GLB (meshopt), converte texture e anteprime in
// WebP ridimensionate e copia tutto in public/modelli.
// Uso: node prepara_per_web.mjs <uscita di Blender> <public/modelli> <ffmpeg> <gltf-transform cli.js>
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [sorgente, destinazione, ffmpeg, gltfTransform] = process.argv.slice(2);
rmSync(destinazione, { recursive: true, force: true });

for (const g of ['m', 'f']) {
  mkdirSync(join(destinazione, g), { recursive: true });
  for (const file of readdirSync(join(sorgente, g)).filter((f) => f.endsWith('.glb'))) {
    execFileSync(process.execPath, [gltfTransform, 'meshopt', join(sorgente, g, file), join(destinazione, g, file)], { stdio: 'ignore' });
  }
}
for (const [png, uscita, lato] of JSON.parse(readFileSync(join(sorgente, 'da-convertire.json'), 'utf8'))) {
  const out = join(destinazione, uscita);
  if (existsSync(out) || !existsSync(png)) continue;
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', png, '-vf', `scale='min(${lato},iw)':-2`,
    '-c:v', 'libwebp', '-quality', '82', '-pix_fmt', 'yuva420p', out]);
}
for (const f of ['catalogo.json', 'crediti.json', 'ossa-m.json', 'ossa-f.json']) copyFileSync(join(sorgente, f), join(destinazione, f));
console.log('pronto');
