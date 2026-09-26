import { preloadBackgrounds } from './background.js';
export function preloadCardAssets(scene) {
  preloadBackgrounds(scene);
  const jpgCards = [
    // Starter deck art
    'knight', 'archer', 'merc', 'catapult', 'champion',
    'warhorn', 'frost', 'medic', 'clear_sky', 'fog', 'blight',
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
    // AI-generated portraits (jpg)
    'spy_scout',
    // AI-generated portraits, Layer 15 cards
    'militia', 'berserker', 'oath_brother',
    'doppelganger', 'dire_wolf', 'forest_shade',
    'blood_count', 'gargoyle', 'scorch_art',
  ];
  for (const key of jpgCards) {
    scene.load.image(key, `./assets/cards/${key}.jpg`);
  }

}

export function preloadBattleAssets(scene) {
  preloadCardAssets(scene);
  scene.load.image('battle_bg', './assets/battle_bg.jpg');
}
