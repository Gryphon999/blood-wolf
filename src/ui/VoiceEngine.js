/**
 * Card voiceover lines via Web Speech API.
 * Humans / non-beast monsters: Russian TTS phrase.
 * Beast cards (wolf, harpy, troll, etc.): synthesized animal sound via SoundEngine.
 */
import { sfx } from './SoundEngine.js';

// ── Beast card → animal sound routing ────────────────────────────────────

// Keys are card `art` values (shared by cards with _a/_b/_c suffixes).
// Lookup uses cardDef.art ?? cardDef.id, so troll_a → art:troll → growl, etc.
const ANIMAL_SOUND = {
  wolf:         'wolfHowl',
  dire_wolf:    'wolfHowl',  // dire_wolf_a/b/c all share art:'dire_wolf'
  werewolf:     'growl',
  beast:        'growl',
  troll:        'growl',     // troll_a/b share art:'troll'
  regen_troll:  'growl',
  ice_giant:    'growl',
  gargoyle:     'growl',     // gargoyle_a/b share art:'gargoyle'
  harpy:        'screech',   // harpy_a/b share art:'harpy'
  harpy_hunter: 'screech',
  serpent:      'hiss',
};

// ── Voice lines per card id ───────────────────────────────────────────────

const LINES = {
  // Starter deck
  merc:           'Золото вперёд.',
  knight:         'За честь и короля!',
  archer:         'Стрела найдёт цель.',
  catapult:       'Огонь!',
  champion:       'Никто не устоит.',
  warhorn:        'В атаку!',
  frost:          'Зима пришла.',
  medic:          'Я сохраню вас живыми.',
  ghoul:          'Мяяяссо...',
  harpy:          'Кровь и перья!',
  troll:          'Тролль давить.',
  beast:          'Я — голод.',
  // Human shop
  shield_knight:  'Щит не сломить.',
  squire:         'Готов служить, милорд.',
  banner:         'Вперёд, братья!',
  paladin:        'Свет укажет путь.',
  poison_arrow:   'Маленький укол — большая смерть.',
  crossbow:       'Болт уже в полёте.',
  sniper:         'Один выстрел. Один враг.',
  eagle_eye:      'Никто не спрячется.',
  field_medic:    'Держитесь, я иду!',
  priest:         'Да пребудет свет.',
  alchemist:      'Наука — моё оружие.',
  order_healer:   'Орден не сдастся.',
  ballista:       'Катапульта готова!',
  engineer:       'Механизм запущен.',
  lightning:      'Небесный огонь!',
  blessing:       'Благодать снизошла.',
  battle_order:   'Приказ отдан.',
  scorch:         'Всё сгорит.',
  spy_scout:      'Тени — мой дом.',
  militia_a:      'За деревню!',
  militia_b:      'Мы все встанем.',
  militia_c:      'Защитим своих!',
  berserker:      'Ааааарргх!!!',
  oath_brother_a: 'Брат рядом.',
  oath_brother_b: 'Вместе победим.',
  king_raven:     'Король говорит — вы слушаете.',
  // Monster shop
  vampire:        'Я пью твою жизнь.',
  bloodsucker:    'Сладкая кровь...',
  necromancer:    'Смерть — лишь начало.',
  lich:           'Вечность — моя.',
  wolf:           'Стая слышит.',
  serpent:        'Яд медленный, но верный.',
  werewolf:       'Луна зовёт меня!',
  harpy_hunter:   'Небо принадлежит нам!',
  fire_demon:     'Горите все!',
  seducer:        'Иди ко мне...',
  archdemon:      'Тьма поглотит вас.',
  chaos_demon:    'Хаос не остановить!!!',
  ice_giant:      'Холод вечен.',
  regen_troll:    'Тролль не умирать.',
  darkness:       'Тьма поглощает всё.',
  blood_ritual:   'Кровь принесена.',
  doppelganger:   'Ты не знаешь, кто я.',
  dire_wolf_a:    'Стая прибывает.',
  dire_wolf_b:    'Ещё один.',
  dire_wolf_c:    'Нас много.',
  forest_shade:   'Лес скрывает меня.',
  blood_count:    'Твоя кровь — моя сила.',
  gargoyle_a:     'Камень оживает.',
  gargoyle_b:     'Гранит и ярость.',
  fang_darkness:  'Тьма Клыков пришла!',
};

// ── Audio file playback ───────────────────────────────────────────────────

let _voiceEnabled = true;
let _voiceVolume = 0.9;

// Cache pre-loaded Audio objects to avoid re-fetch on each play
const _audioCache = new Map();

function getAudio(id) {
  if (!_audioCache.has(id)) {
    _audioCache.set(id, new Audio(`/audio/voices/${id}.mp3`));
  }
  return _audioCache.get(id);
}

// Fallback to Web Speech API when MP3 is unavailable
function speakFallback(cardDef) {
  if (typeof speechSynthesis === 'undefined') return;
  const key = cardDef.art ?? cardDef.id;
  const text = LINES[key] ?? LINES[cardDef.id] ?? cardDef.name ?? '';
  if (!text) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.volume = _voiceVolume;
  utt.rate   = cardDef.faction === 'monsters' ? 0.72 : 0.90;
  utt.pitch  = cardDef.faction === 'monsters' ? 0.45 : 1.10;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}

// ── Speak ─────────────────────────────────────────────────────────────────

export function speakCard(cardDef) {
  if (!_voiceEnabled) return;
  if (_voiceVolume <= 0) return;

  const artKey = cardDef.art ?? cardDef.id;

  // Beast cards → synthesized animal sound
  const animalFn = ANIMAL_SOUND[artKey];
  if (animalFn && sfx[animalFn]) { sfx[animalFn](); return; }

  // For cards with per-instance lines (militia_a/b/c, oath_brother_a/b) the art key
  // has no entry in LINES, so we fall back to the id as the audio file key. Also
  // handles art:'scorch_art' → file is 'scorch.mp3' = card id.
  const audioKey = LINES[artKey] !== undefined ? artKey
    : LINES[cardDef.id] !== undefined ? cardDef.id
    : artKey;

  const audio = getAudio(audioKey);
  audio.volume = _voiceVolume;
  audio.currentTime = 0;
  audio.play().catch(() => speakFallback(cardDef));
}

export function setVoiceEnabled(v) { _voiceEnabled = v; }
export function isVoiceEnabled()   { return _voiceEnabled; }
export function setVoiceVolume(v)  { _voiceVolume = v; }
export function getVoiceVolume()   { return _voiceVolume; }
