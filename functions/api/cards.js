import { letterOf, json, oneLine, block } from '../../lib/utils.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const letter = url.searchParams.get('letter') || '';
  const modeParam = url.searchParams.get('mode');
  const mode = ['recent', 'word', 'random'].includes(modeParam) ? modeParam : 'random';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 300);

  const ORDER = {
    random: 'RANDOM()',
    recent: 'created_at DESC, id DESC',
    word: 'word COLLATE NOCASE ASC, id ASC',
  };
  const all = !letter || letter === 'ALL';

  const sql = all
    ? `SELECT * FROM cards ORDER BY ${ORDER[mode]} LIMIT ?`
    : `SELECT * FROM cards WHERE letter = ? ORDER BY ${ORDER[mode]} LIMIT ?`;

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
  const word = oneLine(body.word, 60);
  const meaning = block(body.meaning, 500);
  const example = block(body.example, 500);

  if (!nickname) return json({ error: '닉네임을 먼저 설정해 주세요.' }, 400);
  if (!word) return json({ error: '단어를 입력해 주세요.' }, 400);
  if (!meaning) return json({ error: '뜻을 입력해 주세요.' }, 400);

  const card = await env.DB.prepare(
    `INSERT INTO cards (word, meaning, example, letter, author)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).bind(word, meaning, example, letterOf(word), nickname).first();

  return json({ card }, 201);
}
