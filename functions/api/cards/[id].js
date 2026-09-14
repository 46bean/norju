import { letterOf, canEdit, json, oneLine, block } from '../../../lib/utils.js';

const MAX_IMAGE = 1_500_000;

function safeImage(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(s)) return null;
  if (s.length > MAX_IMAGE) return null;
  return s;
}

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

  const word = oneLine(body.word, 150) || card.word;
  const meaning = block(body.meaning, 500);
  const displayName = oneLine(body.displayName, 30);

  let image = card.image || '';
  if (body.removeImage) image = '';
  else if (body.image) {
    const checked = safeImage(body.image);
    if (checked === null) return json({ error: '사진 형식이 올바르지 않거나 용량이 너무 큽니다.' }, 400);
    image = checked;
  }

  const updated = await env.DB.prepare(
    `UPDATE cards SET word = ?, meaning = ?, image = ?, letter = ?, display_name = ?,
            updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  ).bind(word, meaning, image, letterOf(word), displayName, params.id).first();

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

  await env.DB.prepare('DELETE FROM notes WHERE card_id = ?').bind(params.id).run();
  await env.DB.prepare('DELETE FROM cards WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
