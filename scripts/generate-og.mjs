/**
 * Génère la carte de partage Open Graph → public/og.png (1200×630).
 *
 * Lancer :  npm run gen:og
 *
 * Principe : on décrit la carte en SVG (texte + dégradés World Cup), puis Sharp
 * la rasterise en PNG. C'est une génération "one-shot" : le PNG produit est un
 * asset statique servi tel quel. Relance ce script après avoir modifié le SVG
 * ci-dessous pour régénérer l'image.
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'og.png');

const W = 1200;
const H = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f0d"/>
      <stop offset="55%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#0d0a10"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="18%" r="70%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#wc)"/>

  <text x="80" y="150" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700"
        letter-spacing="10" fill="#10b981">COUPE DU MONDE · FIFA 26</text>

  <text x="76" y="345" font-family="Arial, Helvetica, sans-serif" font-size="230" font-weight="900"
        letter-spacing="-6" fill="url(#wc)">CDM 26</text>

  <text x="80" y="430" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800"
        fill="#ffffff">Le Mondial esport, en direct sur Twitch.</text>

  <text x="80" y="492" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="500"
        fill="#ffffff" fill-opacity="0.62">32 nations · 8 groupes · matchs live · paris en points de chaîne</text>

  <circle cx="92" cy="560" r="9" fill="#10b981"/>
  <circle cx="122" cy="560" r="9" fill="#facc15"/>
  <circle cx="152" cy="560" r="9" fill="#ef4444"/>
  <text x="176" y="569" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700"
        letter-spacing="4" fill="#ffffff" fill-opacity="0.85">cdm.rgtcity.fr</text>
</svg>`;

mkdirSync(dirname(OUT), { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(OUT, png);

const meta = await sharp(png).metadata();
console.log(`✓ og.png généré : ${meta.width}×${meta.height} — ${Math.round(png.length / 1024)} KB → ${OUT}`);
