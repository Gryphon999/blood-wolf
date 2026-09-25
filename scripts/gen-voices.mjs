/**
 * Generates MP3 voice lines for all non-beast cards using Microsoft Edge TTS.
 * Run from the blood-wolf project root:
 *   node scripts/gen-voices.mjs
 *
 * Requires: npm install msedge-tts  (or npx with a local install)
 * Output: public/audio/voices/<card_id>.mp3
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dir, '..', 'public', 'audio', 'voices');
mkdirSync(OUT_DIR, { recursive: true });

// Voice for humans (heroic confident male)
const VOICE_HUMAN = 'ru-RU-DmitryNeural';
// Voice for monsters (same neural voice, slowed + lowered via SSML)
const VOICE_MONSTER = 'ru-RU-DmitryNeural';

// Card lines: non-beast cards only. Beasts use synthesized animal sounds.
const CARDS = [
  // ── Starter humans ──────────────────────────────────────────────
  { id: 'merc',          text: 'Золото вперёд.',                    faction: 'humans'   },
  { id: 'knight',        text: 'За честь и короля!',                faction: 'humans'   },
  { id: 'archer',        text: 'Стрела найдёт цель.',               faction: 'humans'   },
  { id: 'catapult',      text: 'Огонь!',                            faction: 'humans'   },
  { id: 'champion',      text: 'Никто не устоит.',                  faction: 'humans'   },
  { id: 'warhorn',       text: 'В атаку!',                          faction: 'humans'   },
  { id: 'frost',         text: 'Зима пришла.',                      faction: 'humans'   },
  { id: 'medic',         text: 'Я сохраню вас живыми.',             faction: 'humans'   },
  // ── Human shop ──────────────────────────────────────────────────
  { id: 'shield_knight', text: 'Щит не сломить.',                   faction: 'humans'   },
  { id: 'squire',        text: 'Готов служить, милорд.',            faction: 'humans'   },
  { id: 'banner',        text: 'Вперёд, братья!',                   faction: 'humans'   },
  { id: 'paladin',       text: 'Свет укажет путь.',                 faction: 'humans'   },
  { id: 'poison_arrow',  text: 'Маленький укол — большая смерть.',  faction: 'humans'   },
  { id: 'crossbow',      text: 'Болт уже в полёте.',                faction: 'humans'   },
  { id: 'sniper',        text: 'Один выстрел. Один враг.',          faction: 'humans'   },
  { id: 'eagle_eye',     text: 'Никто не спрячется.',               faction: 'humans'   },
  { id: 'field_medic',   text: 'Держитесь, я иду!',                 faction: 'humans'   },
  { id: 'priest',        text: 'Да пребудет свет.',                 faction: 'humans'   },
  { id: 'alchemist',     text: 'Наука — моё оружие.',               faction: 'humans'   },
  { id: 'order_healer',  text: 'Орден не сдастся.',                 faction: 'humans'   },
  { id: 'ballista',      text: 'Катапульта готова!',                faction: 'humans'   },
  { id: 'engineer',      text: 'Механизм запущен.',                 faction: 'humans'   },
  { id: 'lightning',     text: 'Небесный огонь!',                   faction: 'humans'   },
  { id: 'blessing',      text: 'Благодать снизошла.',               faction: 'humans'   },
  { id: 'battle_order',  text: 'Приказ отдан.',                     faction: 'humans'   },
  { id: 'scorch',        text: 'Всё сгорит.',                       faction: 'humans'   },
  { id: 'spy_scout',     text: 'Тени — мой дом.',                   faction: 'humans'   },
  { id: 'militia_a',     text: 'За деревню!',                       faction: 'humans'   },
  { id: 'militia_b',     text: 'Мы все встанем.',                   faction: 'humans'   },
  { id: 'militia_c',     text: 'Защитим своих!',                    faction: 'humans'   },
  { id: 'berserker',     text: 'Ааааарргх!!!',                      faction: 'humans'   },
  { id: 'oath_brother_a',text: 'Брат рядом.',                       faction: 'humans'   },
  { id: 'oath_brother_b',text: 'Вместе победим.',                   faction: 'humans'   },
  { id: 'king_raven',    text: 'Король говорит — вы слушаете.',     faction: 'humans'   },
  // ── Starter monsters (non-beast) ────────────────────────────────
  { id: 'ghoul',         text: 'Мяяяссо...',                        faction: 'monsters' },
  // ── Monster shop (non-beast) ────────────────────────────────────
  { id: 'vampire',       text: 'Я пью твою жизнь.',                 faction: 'monsters' },
  { id: 'bloodsucker',   text: 'Сладкая кровь...',                  faction: 'monsters' },
  { id: 'necromancer',   text: 'Смерть — лишь начало.',             faction: 'monsters' },
  { id: 'lich',          text: 'Вечность — моя.',                   faction: 'monsters' },
  { id: 'fire_demon',    text: 'Горите все!',                        faction: 'monsters' },
  { id: 'seducer',       text: 'Иди ко мне...',                     faction: 'monsters' },
  { id: 'archdemon',     text: 'Тьма поглотит вас.',                faction: 'monsters' },
  { id: 'chaos_demon',   text: 'Хаос не остановить!!!',             faction: 'monsters' },
  { id: 'darkness',      text: 'Тьма поглощает всё.',               faction: 'monsters' },
  { id: 'blood_ritual',  text: 'Кровь принесена.',                  faction: 'monsters' },
  { id: 'doppelganger',  text: 'Ты не знаешь, кто я.',             faction: 'monsters' },
  { id: 'forest_shade',  text: 'Лес скрывает меня.',                faction: 'monsters' },
  { id: 'blood_count',   text: 'Твоя кровь — моя сила.',            faction: 'monsters' },
  { id: 'fang_darkness', text: 'Тьма Клыков пришла!',               faction: 'monsters' },
];

async function makeStream(tts, card) {
  const prosody = {
    rate: card.faction === 'monsters' ? 0.78 : 0.92,
    pitch: card.faction === 'monsters' ? '-15%' : '+0Hz',
    volume: 90,
  };
  const outPath = join(OUT_DIR, `${card.id}.mp3`);
  return new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(card.text, prosody);
    const file = createWriteStream(outPath);
    let errored = false;
    audioStream.on('error', (e) => { errored = true; reject(e); });
    audioStream.pipe(file);
    file.on('finish', () => { if (!errored) resolve(); });
    file.on('error', reject);
  });
}

async function generate(humanTTS, monsterTTS, card) {
  const tts = card.faction === 'monsters' ? monsterTTS : humanTTS;
  await makeStream(tts, card);
}

// Generate sequentially with retry on failure
(async () => {
  console.log(`Generating ${CARDS.length} voice files → ${OUT_DIR}\n`);

  async function freshTTS(voice) {
    const t = new MsEdgeTTS();
    await t.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});
    return t;
  }

  let humanTTS   = await freshTTS(VOICE_HUMAN);
  let monsterTTS = await freshTTS(VOICE_MONSTER);

  let ok = 0, fail = 0;
  for (const card of CARDS) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        await generate(humanTTS, monsterTTS, card);
        console.log(`✓ ${card.id}.mp3`);
        ok++;
        break;
      } catch (e) {
        attempts++;
        if (attempts >= 3) {
          console.error(`✗ ${card.id}: ${e.message}`);
          fail++;
        } else {
          await new Promise(r => setTimeout(r, 800));
          // Recreate TTS instance on failure
          if (card.faction === 'monsters') {
            monsterTTS = await freshTTS(VOICE_MONSTER);
          } else {
            humanTTS = await freshTTS(VOICE_HUMAN);
          }
        }
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
})();
