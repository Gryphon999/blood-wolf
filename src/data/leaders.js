// Leaders: one ability per match. Display names/descriptions live in src/i18n.
// `art` is the figure shown in battle (public/assets/leaders/<art>.jpg); `icon` is the fallback glyph.
// Faction leaders can be picked by the player and by random arena opponents.
export const LEADERS = [
  { id: 'marshal_godric',  faction: 'humans',   ability: 'rally',            param: 1, icon: '☀', art: 'marshal_godric' },
  { id: 'queen_elina',     faction: 'humans',   ability: 'boost_row',        param: 2, icon: '📣', art: 'queen_elina' },
  { id: 'grand_master',    faction: 'humans',   ability: 'draw_card',        param: 1, icon: '📜', art: 'grand_master' },
  { id: 'brood_queen',     faction: 'monsters', ability: 'damage_strongest', param: 4, icon: '🩸', art: 'brood_queen' },
  { id: 'bone_lord',       faction: 'monsters', ability: 'resurrect',        param: 1, icon: '💀', art: 'bone_lord' },
  { id: 'fog_witch',       faction: 'monsters', ability: 'peek_enemy',       param: 3, icon: '👁', art: 'fog_witch' },
];

// Campaign-only leaders: every story enemy is led by someone. Never offered to the player or the arena.
export const ENEMY_LEADERS = [
  // Chapter I
  { id: 'ataman_krag',     ability: 'boost_row',        param: 1, icon: '🗡', art: 'ataman_krag' },
  { id: 'pack_alpha',      ability: 'boost_row',        param: 2, icon: '🐺', art: 'pack_alpha' },
  { id: 'grave_keeper',    ability: 'resurrect',        param: 1, icon: '⚰', art: 'grave_keeper' },
  { id: 'black_knight',    ability: 'damage_strongest', param: 3, icon: '🛡', art: 'black_knight' },
  { id: 'ancient_wyrm',    ability: 'damage_row',       param: 2, icon: '🐉', art: 'ancient_wyrm' },
  // Chapter II
  { id: 'wolf_king',       ability: 'boost_row',        param: 3, icon: '👑', art: 'wolf_king' },
  { id: 'blood_wolf',      ability: 'bleed_all',        param: 1, icon: '🩸', art: 'blood_wolf' },
  // Chapter III
  { id: 'ice_warden',      ability: 'shield_all',       param: 1, icon: '❄', art: 'ice_warden' },
  { id: 'blade_ghost',     ability: 'draw_card',        param: 2, icon: '🗡', art: 'blade_ghost' },
  { id: 'plague_lord',     ability: 'poison_weakest',   param: 3, icon: '☠', art: 'plague_lord' },
  { id: 'serpent_priest',  ability: 'poison_weakest',   param: 2, icon: '🐍', art: 'serpent_priest' },
  { id: 'fallen_knight',   ability: 'damage_strongest', param: 5, icon: '⚔', art: 'fallen_knight' },
  { id: 'crimson_count',   ability: 'bleed_all',        param: 1, icon: '🦇', art: 'crimson_count' },
  { id: 'storm_lord',      ability: 'damage_row',       param: 2, icon: '⚡', art: 'storm_lord' },
  { id: 'golem_emperor',   ability: 'shield_all',       param: 1, icon: '🗿', art: 'golem_emperor' },
  { id: 'rift_guardian',   ability: 'damage_all',       param: 1, icon: '🌀', art: 'rift_guardian' },
  { id: 'lich_emperor',    ability: 'resurrect',        param: 1, icon: '💀', art: 'lich_emperor' },
].map((l) => ({ ...l, faction: 'monsters', enemyOnly: true }));

export const ALL_LEADERS = [...LEADERS, ...ENEMY_LEADERS];

export function leadersOf(faction) {
  return LEADERS.filter((l) => l.faction === faction);
}

export function getLeader(id) {
  return ALL_LEADERS.find((l) => l.id === id) ?? null;
}

// The profile's chosen leader for a faction, falling back to the faction's first
export function chosenLeader(profile, faction) {
  const picked = getLeader(profile?.leaders?.[faction]);
  return (picked && !picked.enemyOnly ? picked : null) ?? leadersOf(faction)[0] ?? null;
}

export function randomLeader(faction, rng = Math.random) {
  const list = leadersOf(faction);
  return list.length ? list[Math.floor(rng() * list.length) % list.length] : null;
}
