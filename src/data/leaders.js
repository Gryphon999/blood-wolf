// Faction leaders: one ability per match. Display names/descriptions live in src/i18n.
export const LEADERS = [
  { id: 'marshal_godric',  faction: 'humans',   ability: 'clear_weather',    param: 1, icon: '☀' },
  { id: 'queen_elina',     faction: 'humans',   ability: 'boost_row',        param: 2, icon: '📣' },
  { id: 'grand_master',    faction: 'humans',   ability: 'draw_card',        param: 1, icon: '📜' },
  { id: 'brood_queen',     faction: 'monsters', ability: 'damage_strongest', param: 4, icon: '🩸' },
  { id: 'bone_lord',       faction: 'monsters', ability: 'resurrect',        param: 1, icon: '💀' },
  { id: 'fog_witch',       faction: 'monsters', ability: 'peek_enemy',       param: 3, icon: '👁' },
];

export function leadersOf(faction) {
  return LEADERS.filter((l) => l.faction === faction);
}

export function getLeader(id) {
  return LEADERS.find((l) => l.id === id) ?? null;
}

// The profile's chosen leader for a faction, falling back to the faction's first
export function chosenLeader(profile, faction) {
  return getLeader(profile?.leaders?.[faction]) ?? leadersOf(faction)[0] ?? null;
}

export function randomLeader(faction, rng = Math.random) {
  const list = leadersOf(faction);
  return list.length ? list[Math.floor(rng() * list.length) % list.length] : null;
}
