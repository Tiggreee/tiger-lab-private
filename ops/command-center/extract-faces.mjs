#!/usr/bin/env node
/**
 * Face Extractor v2 — ops/command-center/extract-faces.mjs
 * Smart-crop: detects face boundaries per strip, removes all background.
 */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('ops/command-center');
const OUT = resolve('ops/command-center/faces');

const FILES = [
  'CARONAI0.png',
  'CARONMANOTAS.png',
  'caroncampanabotdashboard.png'
];

mkdirSync(OUT, { recursive: true });

async function smartCropFace(imagePath, baseName, faceIndex, stripTop, stripHeight, fullWidth) {
  // Extract the vertical strip
  const strip = sharp(imagePath).extract({
    left: 0,
    top: stripTop,
    width: fullWidth,
    height: stripHeight
  });

  // Get raw pixel data to find face boundaries
  const { data, info } = await strip
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Find non-transparent pixel boundaries (the actual face)
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  let hasContent = false;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > 20) { // Non-transparent pixel = face
        hasContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasContent) {
    // Fallback: center crop 70% of strip
    const marginX = Math.floor(fullWidth * 0.15);
    const marginY = Math.floor(stripHeight * 0.05);
    minX = marginX;
    maxX = fullWidth - marginX;
    minY = marginY;
    maxY = stripHeight - marginY;
  }

  // Add 5% padding
  const padX = Math.floor((maxX - minX) * 0.05);
  const padY = Math.floor((maxY - minY) * 0.05);
  minX = Math.max(0, minX - padX);
  maxX = Math.min(fullWidth, maxX + padX);
  minY = Math.max(0, minY - padY);
  maxY = Math.min(stripHeight, maxY + padY);

  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;

  // Make square by centering
  const size = Math.max(faceWidth, faceHeight);
  const cx = Math.floor(minX + faceWidth / 2);
  const cy = Math.floor(minY + faceHeight / 2);
  const half = Math.floor(size / 2);
  
  let cropLeft = Math.max(0, cx - half);
  let cropTop = Math.max(0, cy - half);
  let cropSize = size;
  
  // Clamp to strip bounds
  if (cropLeft + cropSize > fullWidth) cropLeft = fullWidth - cropSize;
  if (cropTop + cropSize > stripHeight) cropTop = stripHeight - cropSize;
  if (cropLeft < 0) { cropSize += cropLeft; cropLeft = 0; }
  if (cropTop < 0) { cropSize += cropTop; cropTop = 0; }
  
  cropSize = Math.min(cropSize, fullWidth - cropLeft, stripHeight - cropTop);

  const outPath = resolve(OUT, `${baseName}_face${faceIndex + 1}.png`);

  await strip
    .clone()
    .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
    .resize(273, 273, { fit: 'cover', position: 'center' })
    // Remove remaining background: white/light pixels → transparent
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(async ({ data: d, info: inf }) => {
      for (let p = 0; p < d.length; p += 4) {
        if (d[p] > 240 && d[p+1] > 240 && d[p+2] > 240) d[p+3] = 0;
        if (d[p] > 220 && d[p+1] > 220 && d[p+2] > 220 && d[p+3] < 200) d[p+3] = Math.min(50, d[p+3]);
      }
      await sharp(d, { raw: { width: inf.width, height: inf.height, channels: 4 } })
        .png()
        .toFile(outPath);
    });

  return { path: outPath, crop: { left: cropLeft, top: cropTop, size: cropSize }, bounds: { minX, maxX, minY, maxY } };
}

async function main() {
  console.log('=== TIGER AI FACE EXTRACTOR v2 (Smart Crop) ===\n');

  const allFaces = [];

  for (const file of FILES) {
    const filePath = resolve(SRC, file);
    const baseName = file.replace('.png', '');
    const meta = await sharp(filePath).metadata();

    console.log(`📷 ${baseName}: ${meta.width}×${meta.height}px`);
    const stripHeight = Math.floor(meta.height / 4);

    for (let i = 0; i < 4; i++) {
      const stripTop = i * stripHeight;
      const result = await smartCropFace(filePath, baseName, i, stripTop, stripHeight, meta.width);
      console.log(`   ✅ Face ${i + 1}: bounds=[${result.bounds.minX}-${result.bounds.maxX}], crop=${result.crop.size}×${result.crop.size}`);
    }
    console.log('');
  }

  console.log(`=== DONE ===`);
  console.log(`✅ 12 faces smart-cropped to ${OUT}/`);
  console.log(`   All faces: square, centered, no background`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
