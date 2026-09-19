export function preloadCardAssets(scene) {
  const cards = [
    // Original cards
    'knight', 'archer', 'merc', 'catapult', 'champion',
    'warhorn', 'frost', 'medic',
    'ghoul', 'harpy', 'troll', 'beast',
    // Human shop cards (batch 1-2, Canva-generated dark fantasy art)
    'shield_knight', 'squire', 'banner', 'paladin',
    'poison_arrow', 'crossbow', 'sniper',
  ];
  for (const key of cards) {
    scene.load.image(key, `/assets/cards/${key}.jpg`);
  }
}

export function preloadBattleAssets(scene) {
  preloadCardAssets(scene);
  scene.load.image('battle_bg', '/assets/battle_bg.jpg');
}
