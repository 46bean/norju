import { letterOf, canEdit, json, oneLine, block } from '../../../lib/utils.js';

async function load(env, id) {
  return env.DB.prepare('SELECT * FROM cards WHERE id = ?').bind(id).first();
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청입니다.' }, 400); }

  const card = await load(env, params.id);
  if (!card) return json({ error: '카드를 찾을 수 없습니다.' }, 404);

  const nickname = oneLine(body.nickname, 20);
  if (!canEdit(nickname, card.author)) {
    return json({ error: '본인이 작성한 카드만 수정할 수 있습니다.' }, 403);
  }

  const word = oneLine(body.word, 60) || card.word;
  const meaning = block(body.meaning, 500) || card.meaning;
  const example = block(body.example, 500);

  const updated = await env.DB.prepare(
    `UPDATE cards SET word = ?, meaning = ?, example = ?, letter = ?, updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  ).bind(word, meaning, example, letterOf(word), params.id).first();

  return json({ card: updated });
}

export async function onRequestDelete({ request, env, params }) {
  const url = new URL(request.url);
  const nickname = oneLine(url.searchParams.get('nickname'), 20);

  const card = await load(env, params.id);
  if (!card) return json({ error: '카드를 찾을 수 없습니다.' }, 404);
  if (!canEdit(nickname, card.author)) {
    return json({ error: '본인이 작성한 카드만 삭제할 수 있습니다.' }, 403);
  }

  await env.DB.prepare('DELETE FROM cards WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
