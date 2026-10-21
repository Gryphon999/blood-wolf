import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// VK moderation checklist: no system emoji in the UI, they render differently (or not at all) per OS.
// Icons come from src/ui/icons.js instead. ★ is a plain font glyph and stays allowed.
const ALLOWED = new Set(['★']);
const EMOJI = /\p{Extended_Pictographic}/gu;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return p.endsWith('.js') && !p.endsWith('.test.js') ? [p] : [];
  });
}

describe('no system emoji in the UI', () => {
  it('has none in source code, texts or index.html', () => {
    const root = path.resolve(__dirname, '..', '..');
    const files = [...sourceFiles(path.join(root, 'src')), path.join(root, 'index.html')];
    const hits = [];
    for (const file of files) {
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (line.trim().startsWith('//')) return;
        const found = (line.match(EMOJI) ?? []).filter((ch) => !ALLOWED.has(ch));
        if (found.length) hits.push(`${path.relative(root, file)}:${i + 1} ${found.join(' ')}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
