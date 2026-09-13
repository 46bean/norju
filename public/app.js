/* ---------- 기본 ---------- */
const CHO   = ['ㅎ','ㅍ','ㅌ','ㅋ','ㅊ','ㅈ','ㅇ','ㅅ','ㅂ','ㅁ','ㄹ','ㄷ','ㄴ','ㄱ'];
const ALPHA = [...'ZYXWVUTSRQPONMLKJIHGFEDCBA'];
const LETTERS = [...CHO, ...ALPHA, '#'].reverse();   // 내림차순. 오름차순으로 바꾸려면 .reverse() 추가

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const state = {
  nickname: '', admin: false,
  view: 'scatter',
  counts: {}, total: 0,
  letter: null, list: [],
  deck: [], deckIdx: 0, single: false,
  order: shuffle(LETTERS),
};

/* ---------- 닉네임 ---------- */
function applyNickname(name) {
  state.nickname = name;
  state.admin = name.toLowerCase().includes('admin');
  localStorage.setItem('gsmon_nickname', name);
  $('#who').textContent = state.admin ? `${name} (관리자)` : name;
  $('#who').classList.toggle('admin', state.admin);
}

const dlgNick = $('#dlg-nick');
dlgNick.addEventListener('cancel', (e) => { if (!state.nickname) e.preventDefault(); });
function askNickname() { $('#nick-input').value = state.nickname; dlgNick.showModal(); }

$('#form-nick').addEventListener('submit', () => {
  const v = $('#nick-input').value.trim().slice(0, 20);
  if (!v) return;
  applyNickname(v);
  if (!$('#dlg-view').open) return;
  renderDeck();
});

const mine = (author) =>
  state.admin || (!!state.nickname && state.nickname.toLowerCase() === String(author).toLowerCase());

/* ---------- 통계 ---------- */
async function loadStats() {
  const r = await fetch('/api/stats');
  const d = await r.json();
  state.counts = d.counts || {};
  state.total = d.total || 0;
  $('#total').textContent = state.total ? ` 지금까지 ${state.total}개` : '';
  if (state.view === 'scatter') layoutScatter(); else renderIndexGrid();
}

/* ---------- 홈: 흩뿌린 인덱스 ---------- */
function layoutScatter() {
  const host = $('#scatter');
  const W = host.clientWidth;
  if (!W) return;

  const n = state.order.length;
  const cols = Math.max(3, Math.min(9, Math.floor(W / 96)));
  const rows = Math.ceil(n / cols);
  const slotW = W / cols;
  const slotH = Math.max(86, Math.min(slotW * 1.05, 116));
  host.style.height = `${rows * slotH}px`;

  const maxSize = Math.min(80, slotW - 12, slotH - 12);
  const minSize = Math.max(38, maxSize * 0.6);

  host.innerHTML = state.order.map((L, i) => {
    const count = state.counts[L] || 0;
    const ratio = Math.min(count, 10) / 10;
    const size = Math.round(minSize + (maxSize - minSize) * ratio);
    const col = i % cols, row = Math.floor(i / cols);
    const left = col * slotW + Math.random() * (slotW - size);
    const top  = row * slotH + Math.random() * (slotH - size);
    const tilt = (Math.random() * 16 - 8).toFixed(1);

    return `<button class="dot ${count ? '' : 'empty'}" data-letter="${L}"
      style="left:${left.toFixed(1)}px; top:${top.toFixed(1)}px; width:${size}px; height:${size}px;
             transform:rotate(${tilt}deg); font-size:${Math.round(size * 0.4)}px">
      <span>${L}</span><em>${count}</em></button>`;
  }).join('');
}

$('#scatter').addEventListener('click', (e) => {
  const b = e.target.closest('.dot');
  if (b) openDeck(b.dataset.letter);
});

let t;
window.addEventListener('resize', () => {
  clearTimeout(t);
  t = setTimeout(() => { if (state.view === 'scatter') layoutScatter(); }, 160);
});

/* ---------- 전체보기 ---------- */
function renderIndexGrid() {
  $('#index-grid').innerHTML = LETTERS.map((L) => {
    const n = state.counts[L] || 0;
    return `<button class="idx ${n ? '' : 'empty'} ${state.letter === L ? 'on' : ''}"
      data-letter="${L}"><span>${L}</span><em>${n}</em></button>`;
  }).join('');
}

$('#index-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.idx');
  if (!b) return;
  state.letter = b.dataset.letter;
  renderIndexGrid();
  loadWordList();
});

async function loadWordList() {
  const L = state.letter;
  $('#list-title').textContent = `${L}`;
  const r = await fetch(`/api/cards?letter=${encodeURIComponent(L)}&mode=word&limit=300`);
  state.list = (await r.json()).cards || [];
  $('#word-list').innerHTML = state.list.length
    ? state.list.map((c) => `<button class="word-chip" data-id="${c.id}">${esc(c.word)}</button>`).join('')
    : `<p class="empty-msg">이 글자에는 아직 단어가 없어요. '글쓰기'로 첫 단어를 만들어 보세요.</p>`;
}

$('#word-list').addEventListener('click', (e) => {
  const b = e.target.closest('.word-chip');
  if (!b) return;
  const card = state.list.find((c) => String(c.id) === b.dataset.id);
  if (card) openSingle(card);
});

function switchView(v) {
  state.view = v;
  $('#view-scatter').hidden = v !== 'scatter';
  $('#view-list').hidden = v !== 'list';
  $('#btn-toggle').textContent = v === 'scatter' ? '전체보기' : '홈으로';
  if (v === 'scatter') layoutScatter();
  else { renderIndexGrid(); if (state.letter) loadWordList(); }
}

$('#btn-toggle').addEventListener('click', () => switchView(state.view === 'scatter' ? 'list' : 'scatter'));
$('#btn-home').addEventListener('click', () => switchView('scatter'));

/* ---------- 단어 모달 ---------- */
const dlgView = $('#dlg-view');

async function openDeck(letter) {
  state.letter = letter;
  state.single = false;
  const r = await fetch(`/api/cards?letter=${encodeURIComponent(letter)}&mode=random&limit=300`);
  state.deck = (await r.json()).cards || [];
  state.deckIdx = 0;
  renderDeck();
  if (!dlgView.open) dlgView.showModal();
}

function openSingle(card) {
  state.single = true;
  state.deck = [card];
  state.deckIdx = 0;
  renderDeck();
  if (!dlgView.open) dlgView.showModal();
}

function renderDeck() {
  const empty = state.deck.length === 0;
  $('#v-letter').textContent = state.letter || '';
  $('#v-empty').hidden = !empty;
  $('#v-main').hidden = empty;
  $('#v-count').textContent = empty || state.single
    ? '' : `${state.deckIdx + 1} / ${state.deck.length}`;
  if (empty) return;

  const c = state.deck[state.deckIdx];
  $('#v-word').textContent = c.word;
  $('#v-meaning').textContent = c.meaning;
  $('#v-example').textContent = c.example || '';
  $('#v-example').hidden = !c.example;
  $('#v-author').textContent = `by ${c.author}`;
  $('#v-body').hidden = !state.single;          // 목록에서 왔을 땐 바로 보여줌
  $('#v-reveal').hidden = state.single;
  $('#v-next').hidden = state.single || state.deck.length < 2;
  $('#v-tools').innerHTML = mine(c.author)
    ? `<button class="link" data-act="edit">수정</button>
       <button class="link danger" data-act="del">삭제</button>` : '';
}

$('#v-reveal').addEventListener('click', () => {
  $('#v-body').hidden = false;
  $('#v-reveal').hidden = true;
});

$('#v-next').addEventListener('click', () => {
  state.deckIdx = (state.deckIdx + 1) % state.deck.length;
  renderDeck();
});

$('#v-close').addEventListener('click', () => dlgView.close());
$('#v-empty-write').addEventListener('click', () => { dlgView.close(); openForm(null); });

$('#v-tools').addEventListener('click', async (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  const c = state.deck[state.deckIdx];

  if (act === 'edit') { dlgView.close(); openForm(c); return; }

  if (!confirm(`'${c.word}' 카드를 삭제할까요?`)) return;
  const r = await fetch(`/api/cards/${c.id}?nickname=${encodeURIComponent(state.nickname)}`,
    { method: 'DELETE' });
  if (!r.ok) { alert((await r.json()).error); return; }

  state.deck.splice(state.deckIdx, 1);
  if (state.deckIdx >= state.deck.length) state.deckIdx = 0;
  if (state.single || !state.deck.length) dlgView.close(); else renderDeck();
  await loadStats();
  if (state.view === 'list' && state.letter) loadWordList();
});

/* ---------- 작성 / 수정 ---------- */
function openForm(card) {
  $('#card-form-title').textContent = card ? '카드 수정' : '단어 카드 작성';
  $('#card-id').value = card ? card.id : '';
  $('#f-word').value = card ? card.word : '';
  $('#f-meaning').value = card ? card.meaning : '';
  $('#f-example').value = card ? (card.example || '') : '';
  $('#form-error').textContent = '';
  $('#dlg-card').showModal();
}

$('#btn-write').addEventListener('click', () => openForm(null));
$('#card-cancel').addEventListener('click', () => $('#dlg-card').close());
$('#btn-nick').addEventListener('click', askNickname);

$('#form-card').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#card-id').value;
  const payload = {
    nickname: state.nickname,
    word: $('#f-word').value,
    meaning: $('#f-meaning').value,
    example: $('#f-example').value,
  };
  const r = await fetch(id ? `/api/cards/${id}` : '/api/cards', {
    method: id ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) { $('#form-error').textContent = data.error || '저장에 실패했습니다.'; return; }

  $('#dlg-card').close();
  state.letter = data.card.letter;
  await loadStats();
  if (state.view === 'list') { renderIndexGrid(); loadWordList(); }
  openSingle(data.card);
});

/* ---------- 시작 ---------- */
(function init() {
  const saved = localStorage.getItem('gsmon_nickname');
  if (saved) applyNickname(saved); else askNickname();
  switchView('scatter');
  loadStats();
})(); 
