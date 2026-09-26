// Prepares the card illustrations that ship with the game (run once after art changes: node scripts/prepare-card-art.mjs).
//  * 12 starter cards were full card renders (frame + rules text baked into the picture, and the text did not
//    match the real rules). Their originals are kept in assets-src/cards-original/ and the illustration window is cut out.
//  * The AI-generated square PNG portraits (2+ MB each, some saved with a .jpg name) become real, small JPEGs.
// The game draws frame, name, numbers and rules text itself (src/ui/CardView.js), so the art must be picture only.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'public/assets/cards';
const ORIGINALS = 'assets-src/cards-original';

// Illustration window inside the 848x1264 baked cards (same template for all of them). Inset a little to drop
// the frame, the arrow ornaments and the second title plate that overlaps the bottom of some pictures.
const BAKED = ['archer', 'beast', 'catapult', 'champion', 'frost', 'ghoul', 'harpy', 'knight', 'medic', 'merc', 'troll', 'warhorn'];
const BAKED_CROP = { left: 112, top: 215, width: 626, height: 530 };

const SQUARE_PNG = [
  'berserker', 'blood_count', 'dire_wolf', 'doppelganger', 'forest_shade', 'gargoyle', 'militia', 'oath_brother', 'scorch_art',
];

async function main() {
  fs.mkdirSync(ORIGINALS, { recursive: true });

  for (const id of BAKED) {
    const file = path.join(DIR, `${id}.jpg`);
    const backup = path.join(ORIGINALS, `${id}.jpg`);
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup); // never crop an already cropped file
    await sharp(backup).extract(BAKED_CROP).jpeg({ quality: 90, mozjpeg: true }).toFile(`${file}.tmp`);
    fs.renameSync(`${file}.tmp`, file);
    console.log('cropped', id);
  }

  for (const id of SQUARE_PNG) {
    const src = path.join(DIR, `${id}.png`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(ORIGINALS, `${id}.png`));
    await sharp(src).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(DIR, `${id}.jpg`));
    fs.unlinkSync(src);
    console.log('converted', id);
  }

  // spy_scout.jpg is really a PNG (2 MB)
  const spy = path.join(DIR, 'spy_scout.jpg');
  const meta = await sharp(spy).metadata();
  if (meta.format === 'png') {
    fs.copyFileSync(spy, path.join(ORIGINALS, 'spy_scout.png'));
    await sharp(spy).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 88, mozjpeg: true }).toFile(`${spy}.tmp`);
    fs.renameSync(`${spy}.tmp`, spy);
    console.log('converted spy_scout');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
