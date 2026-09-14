import { json } from '../../lib/utils.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT letter, COUNT(*) AS n FROM cards GROUP BY letter'
  ).all();
  const counts = Object.fromEntries(results.map((r) => [r.letter, r.n]));
  const total = results.reduce((s, r) => s + r.n, 0);
  return json({ counts, total });
}
