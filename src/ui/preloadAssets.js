export function preloadCardAssets(scene) {
  const cards = [
    // Starter deck art
    'knight', 'archer', 'merc', 'catapult', 'champion',
    'warhorn', 'frost', 'medic',
    'ghoul', 'harpy', 'troll', 'beast',
    // Human shop cards
    'shield_knight', 'squire', 'banner', 'paladin',
    'poison_arrow', 'crossbow', 'sniper', 'eagle_eye',
    'field_medic', 'priest', 'alchemist', 'order_healer',
    'ballista', 'engineer',
    'lightning', 'blessing', 'battle_order',
    'king_raven',
    // Monster shop cards
    'vampire', 'bloodsucker', 'necromancer', 'lich',
    'wolf', 'serpent', 'werewolf', 'harpy_hunter',
    'fire_demon', 'seducer', 'archdemon', 'chaos_demon',
    'ice_giant', 'regen_troll',
    'darkness', 'blood_ritual',
    'fang_darkness',
  ];
  for (const key of cards) {
    scene.load.image(key, `/assets/cards/${key}.jpg`);
  }
}

export function preloadBattleAssets(scene) {
  preloadCardAssets(scene);
  scene.load.image('battle_bg', '/assets/battle_bg.jpg');
}
