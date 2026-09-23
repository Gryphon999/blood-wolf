export function floatText(scene, x, y, text, color = '#ffffff', size = '20px') {
  const t = scene.add.text(x, y, text, {
    fontSize: size, color,
    stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(200);

  scene.tweens.add({
    targets: t,
    y: y - 52, alpha: 0, scale: 1.35,
    duration: 820, ease: 'Power2',
    onComplete: () => t.destroy(),
  });
}
