import { canEdit, json, oneLine, block } from '../../lib/utils.js';

export async function onRequestGet({ request, env }) {
  const cardId = new URL(request.url).searchParams.get('card_id');
  if (!cardId) return json({ error: 'card_id가 필요합니다.' }, 400);

  const { results } = await env.DB.prepare(
    'SELECT * FROM notes WHERE card_id = ? ORDER BY created_at ASC, id ASC'
  ).bind(cardId).all();

  return json({ notes: results });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청입니다.' }, 400); }

  const nickname = oneLine(body.nickname, 20);
  const displayName = oneLine(body.displayName, 30);
  const bodyText = block(body.body, 500);
  const cardId = parseInt(body.cardId, 10);

  if (!nickname) return json({ error: '닉네임을 먼저 설정해 주세요.' }, 400);
  if (!bodyText) return json({ error: '내용을 입력해 주세요.' }, 400);
  if (!cardId) return json({ error: '대상 카드를 찾을 수 없습니다.' }, 400);

  const card = await env.DB.prepare('SELECT id FROM cards WHERE id = ?').bind(cardId).first();
  if (!card) return json({ error: '카드를 찾을 수 없습니다.' }, 404);

  const note = await env.DB.prepare(
    `INSERT INTO notes (card_id, body, author, display_name)
     VALUES (?, ?, ?, ?) RETURNING *`
  ).bind(cardId, bodyText, nickname, displayName).first();

  return json({ note }, 201);
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const nickname = oneLine(url.searchParams.get('nickname'), 20);

  const note = await env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  if (!note) return json({ error: '찾을 수 없습니다.' }, 404);
  if (!canEdit(nickname, note.author)) {
    return json({ error: '본인이 작성한 내용만 삭제할 수 있습니다.' }, 403);
  }

  await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
