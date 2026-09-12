export function preloadCardAssets(scene) {
  scene.load.image('knight', '/assets/cards/knight.jpg');
  scene.load.image('archer', '/assets/cards/archer.jpg');
  scene.load.image('medic', '/assets/cards/medic.jpg');
}

export function preloadBattleAssets(scene) {
  preloadCardAssets(scene);
  scene.load.image('battle_bg', '/assets/battle_bg.jpg');
}
