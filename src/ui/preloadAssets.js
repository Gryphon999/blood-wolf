export function preloadCardAssets(scene) {
  const cards = [
    'knight', 'archer', 'merc', 'catapult', 'champion',
    'warhorn', 'frost',
    'ghoul', 'harpy', 'troll', 'beast',
    'medic',
  ];
  for (const key of cards) {
    scene.load.image(key, `/assets/cards/${key}.jpg`);
  }
}

export function preloadBattleAssets(scene) {
  preloadCardAssets(scene);
  scene.load.image('battle_bg', '/assets/battle_bg.jpg');
}
