/**
 * Procedural card art for cards without a portrait JPG.
 * Uses an HTML Canvas element + scene.textures.addCanvas() — no RenderTexture needed.
 */

const DESIGNS = {
  // ── Humans ───────────────────────────────────────────────────────────────
  spy_scout:      { bg: ['#1a1228', '#2a1a3a'], glow: '#9955cc' },
  militia_a:      { bg: ['#1c1608', '#2e220e'], glow: '#aa8833' },
  militia_b:      { bg: ['#1c1608', '#2e220e'], glow: '#aa8833' },
  militia_c:      { bg: ['#1c1608', '#2e220e'], glow: '#aa8833' },
  berserker:      { bg: ['#200808', '#3a1010'], glow: '#dd3311' },
  oath_brother_a: { bg: ['#081820', '#102a34'], glow: '#33aacc' },
  oath_brother_b: { bg: ['#081820', '#102a34'], glow: '#33aacc' },
  // ── Monsters ─────────────────────────────────────────────────────────────
  doppelganger:   { bg: ['#0e0e1e', '#201828'], glow: '#cc44ee' },
  dire_wolf_a:    { bg: ['#100c08', '#1e1610'], glow: '#886644' },
  dire_wolf_b:    { bg: ['#100c08', '#1e1610'], glow: '#886644' },
  dire_wolf_c:    { bg: ['#100c08', '#1e1610'], glow: '#886644' },
  forest_shade:   { bg: ['#081008', '#101c10'], glow: '#44aa66' },
  blood_count:    { bg: ['#1a0408', '#2e0810'], glow: '#cc1133' },
  gargoyle_a:     { bg: ['#141018', '#221a28'], glow: '#887799' },
  gargoyle_b:     { bg: ['#141018', '#221a28'], glow: '#887799' },
  // ── Specials ─────────────────────────────────────────────────────────────
  scorch:         { bg: ['#200800', '#3a1800'], glow: '#ff4400' },
  clear_sky:      { bg: ['#081428', '#102038'], glow: '#4488cc' },
  blight:         { bg: ['#0c0c0c', '#181414'], glow: '#886644' },
  fog:            { bg: ['#141420', '#202030'], glow: '#8899aa' },
};

const FACTION_FALLBACK = {
  humans:   { bg: ['#1a1608', '#2c2010'], glow: '#ddaa44' },
  monsters: { bg: ['#0e0808', '#1e1010'], glow: '#aa2222' },
};

const W = 80;
const H = 112;

function hexToRgbStr(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`;
}

function generateArt(scene, cardId, faction) {
  const key = `art_${cardId}`;
  if (scene.textures.exists(key)) return key;

  const cfg = DESIGNS[cardId] ?? FACTION_FALLBACK[faction] ?? FACTION_FALLBACK.monsters;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, cfg.bg[0]);
  grad.addColorStop(1, cfg.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Glow circle
  const rgb = hexToRgbStr(cfg.glow);
  const radGrad = ctx.createRadialGradient(W / 2, H / 2 - 4, 4, W / 2, H / 2 - 4, 38);
  radGrad.addColorStop(0, `rgba(${rgb}, 0.28)`);
  radGrad.addColorStop(1, `rgba(${rgb}, 0.0)`);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);

  // Corner diamond decorations
  ctx.fillStyle = `rgba(${rgb}, 0.40)`;
  [[7, 7], [W - 7, 7], [7, H - 7], [W - 7, H - 7]].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  });

  // Central crest: a drawn diamond in the glow colour (no font glyphs, so it looks the same everywhere)
  const mx = W / 2;
  const my = H / 2 - 4;
  ctx.strokeStyle = cfg.glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx, my - 16);
  ctx.lineTo(mx + 12, my);
  ctx.lineTo(mx, my + 16);
  ctx.lineTo(mx - 12, my);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = cfg.glow;
  ctx.beginPath();
  ctx.arc(mx, my, 4, 0, Math.PI * 2);
  ctx.fill();

  // Register as Phaser texture
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensureCardArt(scene, cardDef) {
  if (cardDef.art && scene.textures.exists(cardDef.art)) return cardDef.art;
  return generateArt(scene, cardDef.id, cardDef.faction);
}
