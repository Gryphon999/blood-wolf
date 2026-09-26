// Turns the generated 3:2 paintings in assets-src/backgrounds/ into the 16:9 backgrounds the game loads.
//   node scripts/prepare-backgrounds.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'public/assets/bg';
const JOBS = [
  { src: 'menu_src.jpg', out: 'bg_menu.jpg' },
  { src: 'hall_src.jpg', out: 'bg_hall.jpg' },
  { src: 'field_src.jpg', out: 'bg_field.jpg' },
];

fs.mkdirSync(OUT, { recursive: true });
for (const { src, out } of JOBS) {
  const input = `assets-src/backgrounds/${src}`;
  const meta = await sharp(input).metadata();
  const height = Math.round((meta.width * 9) / 16);
  const top = Math.round((meta.height - height) / 2);
  await sharp(input)
    .extract({ left: 0, top, width: meta.width, height })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(`${OUT}/${out}`);
  console.log(out, `${meta.width}x${height}`, `${(fs.statSync(`${OUT}/${out}`).size / 1024) | 0} KB`);
}
