#!/usr/bin/env node
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('ops/command-center/faces');
const OUT = resolve('ops/command-center/faces');

const FILES = [
  'Copilot_20260613_002326.png','Copilot_20260613_002457.png','Copilot_20260613_002729.png',
  'Copilot_20260613_002939.png','Copilot_20260613_003102.png','Copilot_20260613_003257.png',
  'Copilot_20260613_003439.png','Copilot_20260613_003620.png','Copilot_20260613_003747.png'
];

mkdirSync(OUT, { recursive: true });

async function cleanFace(file) {
  const fp = resolve(SRC, file);
  const cleaned = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = cleaned;
  
  // Remove background
  for (let p = 0; p < data.length; p += 4) {
    const r = data[p], g = data[p+1], b = data[p+2];
    if (r > 200 && g > 200 && b > 200) { data[p+3] = 0; continue; }
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max - min < 30 && min > 180) { data[p+3] = 0; }
  }

  // Find face bounds
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0, content = false;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 30) {
        content = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }

  if (!content) { minX = 0; maxX = info.width - 1; minY = 0; maxY = info.height - 1; }

  const pad = 12;
  minX = Math.max(0, minX - pad); maxX = Math.min(info.width - 1, maxX + pad);
  minY = Math.max(0, minY - pad); maxY = Math.min(info.height - 1, maxY + pad);
  const fw = maxX - minX, fh = maxY - minY;
  const size = Math.min(Math.max(fw, fh), info.width - minX, info.height - minY);
  const cx = Math.floor(minX + fw / 2), cy = Math.floor(minY + fh / 2), half = Math.floor(size / 2);
  let cl = Math.max(0, cx - half), ct = Math.max(0, cy - half);
  let cs = Math.min(size, info.width - cl, info.height - ct);

  const outFile = file.replace('.png', '_face.png');
  const outPath = resolve(OUT, outFile);
  
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: cl, top: ct, width: cs, height: cs })
    .resize(273, 340, { fit: 'cover', position: 'center' })
    .png().toFile(outPath);

  console.log(`   ✅ ${outFile}: bounds=[${minX}-${maxX},${minY}-${maxY}], → ${cs}×${cs}→273×340, content=${content}`);
  return { file: outFile, bounds: { minX, maxX, minY, maxY } };
}

async function main() {
  console.log('=== FACE CLEANER v4 (individual faces) ===\n');
  const faces = [];
  for (const file of FILES) {
    const result = await cleanFace(file);
    faces.push(result);
  }
  console.log(`\n=== DONE: ${faces.length} faces in ${OUT}/ ===`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
