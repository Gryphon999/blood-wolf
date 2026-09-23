let nextUid = 1;

export function createCard(def) {
  return {
    uid: nextUid++,
    def,
    power: def.power,
    armorLeft: def.armor ?? 0,
    orderUsed: false,
    chargesLeft: def.chargeMax ?? 0,
    bleedStacks: 0,
    poisoned: false,
    locked: false,
    shielded: false,
    controlled: false,
    isCopy: false,
  };
}
