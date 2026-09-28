// Prepares the leader statuettes shown in battle (run after art changes: node scripts/prepare-leader-art.mjs).
// Originals (2:3 renders on black, 832x1248) live in assets-src/leaders/<id>.jpg.
// The game draws them with the SCREEN blend (src/ui/LeaderFigure.js), where black means "nothing here", so:
//  * near-black is pushed to true black (the generator leaves a faint haze around the figure);
//  * the picture fades to black toward the edges, so no rectangle shows inside the niche.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'assets-src/leaders';
const OUT = 'public/assets/leaders';
const W = 480;
const H = 720;
const PAD = 14;

const edgeFade = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="72%" gradientTransform="translate(0.5 0.5) scale(0.86 1) translate(-0.5 -0.5)">
      <stop offset="0.84" stop-color="#fff"/>
      <stop offset="1" stop-color="#000"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f));
  for (const file of files) {
    const id = path.parse(file).name;
    // Cut the empty black margins so the figure fills the niche, then stand it on the bottom edge
    const trimmed = await sharp(path.join(SRC, file))
      .linear(1.1, -16) // crush the haze, keep the highlights
      .trim({ background: '#000000', threshold: 28 })
      .toBuffer();
    const fitted = await sharp(trimmed)
      .resize(W - 2 * PAD, H - 2 * PAD, { fit: 'contain', position: 'south', background: '#000000' })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: '#000000' })
      .toBuffer();
    await sharp(fitted)
      .composite([{ input: edgeFade, blend: 'multiply' }])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(path.join(OUT, `${id}.jpg`));
    console.log('prepared', id);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
