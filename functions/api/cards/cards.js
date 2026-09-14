import { letterOf, json, oneLine, block } from '../../lib/utils.js';

const MAX_IMAGE = 1_500_000;

function safeImage(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(s)) return null;
  if (s.length > MAX_IMAGE) return null;
  return s;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const letter = url.searchParams.get('letter') || '';
  const modeParam = url.searchParams.get('mode');
  const mode = ['recent', 'word', 'random'].includes(modeParam) ? modeParam : 'random';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 300);
  const light = url.searchParams.get('light') === '1';

  const ORDER = {
    random: 'RANDOM()',
    recent: 'created_at DESC, id DESC',
    word: 'word COLLATE NOCASE ASC, id ASC',
  };
  const all = !letter || letter === 'ALL';

  const cols = light
    ? 'id, word, meaning, letter, author, display_name, created_at, (image != \'\') AS has_image'
    : '*';

  const sql = all
    ? `SELECT ${cols} FROM cards ORDER BY ${ORDER[mode]} LIMIT ?`
    : `SELECT ${cols} FROM cards WHERE letter = ? ORDER BY ${ORDER[mode]} LIMIT ?`;

  const stmt = all
    ? env.DB.prepare(sql).bind(limit)
    : env.DB.prepare(sql).bind(letter, limit);

  const { results } = await stmt.all();
  return json({ cards: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청입니다.' }, 400); }

  const nickname = oneLine(body.nickname, 20);
  const displayName = oneLine(body.displayName, 30);
  const word = oneLine(body.word, 150);
  const meaning = block(body.meaning, 500);
  const image = safeImage(body.image);

  if (!nickname) return json({ error: '닉네임을 먼저 설정해 주세요.' }, 400);
  if (!word) return json({ error: '단어를 입력해 주세요.' }, 400);
  if (image === null) return json({ error: '사진 형식이 올바르지 않거나 용량이 너무 큽니다.' }, 400);

  const card = await env.DB.prepare(
    `INSERT INTO cards (word, meaning, example, image, letter, author, display_name)
     VALUES (?, ?, '', ?, ?, ?, ?) RETURNING *`
  ).bind(word, meaning, image, letterOf(word), nickname, displayName).first();

  return json({ card }, 201);
}
