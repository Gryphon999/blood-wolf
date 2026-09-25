/**
 * Card voiceover lines via Web Speech API.
 * Humans / non-beast monsters: Russian TTS phrase.
 * Beast cards (wolf, harpy, troll, etc.): synthesized animal sound via SoundEngine.
 */
import { sfx } from './SoundEngine.js';

// ── Beast card → animal sound routing ────────────────────────────────────

// Cards in this map play an animal sound instead of TTS
const ANIMAL_SOUND = {
  wolf:         'wolfHowl',
  dire_wolf_a:  'wolfHowl',
  dire_wolf_b:  'wolfHowl',
  dire_wolf_c:  'wolfHowl',
  werewolf:     'growl',
  beast:        'growl',
  troll:        'growl',
  regen_troll:  'growl',
  ice_giant:    'growl',
  gargoyle_a:   'growl',
  gargoyle_b:   'growl',
  harpy:        'screech',
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

// ── Voice selection ───────────────────────────────────────────────────────

let _voices = [];
let _voiceEnabled = true;
let _voiceVolume = 0.9;

function loadVoices() {
  _voices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(faction) {
  if (!_voices.length) return null;
  const ru = _voices.filter((v) => v.lang.startsWith('ru'));
  if (!ru.length) return _voices.find((v) => v.lang.startsWith('en')) ?? null;

  // Neural AI voices (Google WaveNet/Chirp in Chrome) are marked non-local
  const neural = ru.find((v) => !v.localService);

  if (faction === 'monsters') {
    // Deep male voice for monsters — Pavel if available, else neural
    const pavel = ru.find((v) => v.name.includes('Pavel'));
    return pavel ?? neural ?? ru[0];
  }

  // Humans / specials: neural AI voice preferred
  return neural ?? ru[0];
}

// ── Speak ─────────────────────────────────────────────────────────────────

let _queue = [];
let _speaking = false;

function processQueue() {
  if (_speaking || _queue.length === 0) return;
  const utt = _queue.shift();
  _speaking = true;
  speechSynthesis.speak(utt);
}

export function speakCard(cardDef) {
  if (!_voiceEnabled) return;
  if (_voiceVolume <= 0) return;

  // Beast cards use synthesized animal sounds, not TTS
  const animalFn = ANIMAL_SOUND[cardDef.id];
  if (animalFn && sfx[animalFn]) {
    sfx[animalFn]();
    return;
  }

  if (typeof speechSynthesis === 'undefined') return;

  const text = LINES[cardDef.id] ?? cardDef.name ?? '';
  if (!text) return;

  const utt = new SpeechSynthesisUtterance(text);
  utt.volume = _voiceVolume;

  if (cardDef.faction === 'monsters') {
    utt.rate  = 0.72;
    utt.pitch = 0.45;
  } else {
    utt.rate  = 0.90;
    utt.pitch = 1.10;
  }

  const v = pickVoice(cardDef.faction);
  if (v) utt.voice = v;

  utt.onend = () => {
    _speaking = false;
    processQueue();
  };
  utt.onerror = () => {
    _speaking = false;
    processQueue();
  };

  _queue = [utt];
  if (!_speaking) processQueue();
}

export function setVoiceEnabled(v) { _voiceEnabled = v; }
export function isVoiceEnabled()   { return _voiceEnabled; }
export function setVoiceVolume(v)  { _voiceVolume = v; }
export function getVoiceVolume()   { return _voiceVolume; }
