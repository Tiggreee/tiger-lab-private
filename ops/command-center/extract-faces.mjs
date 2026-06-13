#!/usr/bin/env node
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('ops/command-center/faces');
const OUT = resolve('ops/command-center/faces');

const FILES = ['CARONAI0.png', 'CARONMANOTAS.png', 'caroncampañabotdashboard.png'];

mkdirSync(OUT, { recursive: true });

async function smartCropFace(imagePath, baseName, faceIndex, stripTop, stripHeight, fullWidth) {
  const strip = sharp(imagePath).extract({ left: 0, top: stripTop, width: fullWidth, height: stripHeight });

  // Step 1: Remove background FIRST
  const cleaned = await strip.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = cleaned;
  
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p+1], b = data[p+2];
    if (r > 200 && g > 200 && b > 200) { data[p+3] = 0; continue; }
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max - min < 30 && min > 180) { data[p+3] = 0; }
  }

  // Step 2: Find face boundaries in cleaned image
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0, content = false;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 30) {
        content = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!content) { minX = Math.floor(fullWidth * 0.1); maxX = Math.floor(fullWidth * 0.9); minY = 0; maxY = stripHeight - 1; }

  const pad = 8;
  minX = Math.max(0, minX - pad); maxX = Math.min(fullWidth - 1, maxX + pad);
  minY = Math.max(0, minY - pad); maxY = Math.min(stripHeight - 1, maxY + pad);
  const fw = maxX - minX, fh = maxY - minY;
  const size = Math.max(fw, fh);
  const cx = Math.floor(minX + fw / 2), cy = Math.floor(minY + fh / 2), half = Math.floor(size / 2);
  let cropL = Math.max(0, cx - half), cropT = Math.max(0, cy - half);
  let cropS = Math.min(size, fullWidth - cropL, stripHeight - cropT);

  const outPath = resolve(OUT, `${baseName}_face${faceIndex + 1}.png`);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: cropL, top: cropT, width: cropS, height: cropS })
    .resize(273, 340, { fit: 'cover', position: 'center' })
    .png().toFile(outPath);

  console.log(`   ✅ Face ${faceIndex + 1}: bounds=[${minX}-${maxX},${minY}-${maxY}], crop=${cropS}×${cropS}, content=${content}`);
}

async function main() {
  console.log('=== TIGER AI FACE EXTRACTOR v3 ===\n');
  for (const file of FILES) {
    const fp = resolve(SRC, file);
    const meta = await sharp(fp).metadata();
    console.log(`📷 ${file}: ${meta.width}×${meta.height}px`);
    const sh = Math.floor(meta.height / 4);
    for (let i = 0; i < 4; i++) await smartCropFace(fp, file.replace('.png',''), i, i * sh, sh, meta.width);
    console.log('');
  }
  console.log(`=== DONE: 12 faces in ${OUT}/ ===`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
