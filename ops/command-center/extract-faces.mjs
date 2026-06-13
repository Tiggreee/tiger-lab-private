#!/usr/bin/env node
/**
 * Face Extractor — ops/command-center/extract-faces.mjs
 * Splits 3 PNGs into 12 individual face files with transparent backgrounds.
 */

import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('ops/command-center');
const OUT = resolve('ops/command-center/faces');

const FILES = [
  'CARONAI0.png',
  'CARONMANOTAS.png',
  'caroncampanabotdashboard.png'
];

mkdirSync(OUT, { recursive: true });

async function extractFaces(filePath, baseName) {
  const image = sharp(filePath);
  const meta = await image.metadata();
  
  console.log(`\n📷 ${baseName}: ${meta.width}×${meta.height}px`);
  
  // Determine split direction: if width > height, split horizontally (4 cols)
  // Otherwise split vertically (4 rows)
  const isHorizontal = meta.width > meta.height;
  const stripSize = Math.floor(isHorizontal ? meta.width / 4 : meta.height / 4);
  
  console.log(`   Split: ${isHorizontal ? 'horizontal' : 'vertical'}, strip: ${stripSize}px`);
  
  const faces = [];
  
  for (let i = 0; i < 4; i++) {
    const extractOpts = isHorizontal
      ? { left: i * stripSize, top: 0, width: stripSize, height: meta.height }
      : { left: 0, top: i * stripSize, width: meta.width, height: stripSize };
    
    const outPath = resolve(OUT, `${baseName}_face${i + 1}.png`);
    
    await image
      .clone()
      .extract(extractOpts)
      // Remove background: make near-white/light pixels transparent
      // Threshold: any pixel where all channels > 240 becomes transparent
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(async ({ data, info }) => {
        // Process raw pixels to remove background
        for (let p = 0; p < data.length; p += 4) {
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          // If pixel is very light (near white/gray background), make transparent
          if (r > 235 && g > 235 && b > 235) {
            data[p + 3] = 0; // alpha to 0
          }
          // Also remove pure white/light gray
          if (r > 250 && g > 250 && b > 250) {
            data[p + 3] = 0;
          }
        }
        
        await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
          .png()
          .toFile(outPath);
      });
    
    faces.push(outPath);
    console.log(`   ✅ Face ${i + 1}: ${outPath}`);
  }
  
  return faces;
}

async function main() {
  console.log('=== TIGER AI FACE EXTRACTOR ===\n');
  console.log('Splitting 3 PNGs into 12 individual faces...');
  
  const allFaces = [];
  
  for (const file of FILES) {
    const filePath = resolve(SRC, file);
    const baseName = file.replace('.png', '');
    const faces = await extractFaces(filePath, baseName);
    allFaces.push(...faces);
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`✅ ${allFaces.length} faces extracted to ${OUT}/`);
  console.log(`\nFace files:`);
  allFaces.forEach(f => console.log(`   ${f}`));
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
