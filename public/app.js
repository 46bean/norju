/* ---------- 기본 ---------- */
const CHO   = ['ㅎ','ㅍ','ㅌ','ㅋ','ㅊ','ㅈ','ㅇ','ㅅ','ㅂ','ㅁ','ㄹ','ㄷ','ㄴ','ㄱ'];
const ALPHA = [...'ZYXWVUTSRQPONMLKJIHGFEDCBA'];
const LETTERS = [...CHO, ...ALPHA, '#'].reverse();

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
  nickname: '', myName: '', admin: false,
  view: 'scatter',
  counts: {}, total: 0,
  letter: null, list: [],
  deck: [], deckIdx: 0, single: false,
  notes: [],
  order: shuffle(LETTERS),
};

/* ---------- 닉네임 / 이름 ---------- */
function applyIdentity(name, display) {
  state.nickname = name;
  state.myName = display || '';
  state.admin = name.toLowerCase().includes('admin');
  localStorage.setItem('gsmon_nickname', name);
  localStorage.setItem('gsmon_myname', state.myName);
  const shown = state.myName ? `${state.myName} (${name})` : name;
  $('#who').textContent = state.admin ? `${shown} · 관리자` : shown;
  $('#who').classList.toggle('admin', state.admin);
}

const dlgNick = $('#dlg-nick');
dlgNick.addEventListener('cancel', (e) => { if (!state.nickname) e.preventDefault(); });

function askNickname() {
  $('#nick-input').value = state.nickname;
  $('#name-input').value = state.myName;
  dlgNick.showModal();
}

$('#form-nick').addEventListener('submit', () => {
  const v = $('#nick-input').value.trim().slice(0, 20);
  if (!v) return;
  applyIdentity(v, $('#name-input').value.trim().slice(0, 30));
  if ($('#dlg-view').open && state.deck.length) renderDeck();
});

const mine = (author) =>
  state.admin || (!!state.nickname && state.nickname.toLowerCase() === String(author).toLowerCase());

const nameOf = (o) => (o.display_name && o.display_name.trim()) || o.author;

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
  const r = await fetch(`/api/cards?letter=${encodeURIComponent(L)}&mode=word&limit=300&light=1`);
  state.list = (await r.json()).cards || [];
  $('#word-list').innerHTML = state.list.length
    ? state.list.map((c) => `<button class="word-chip" data-id="${c.id}">${esc(c.word)}${
        c.has_image ? ' <span class="pin">사진</span>' : ''}</button>`).join('')
    : `<p class="empty-msg">이 글자에 연결된 단어가 없어요. '글쓰기'로 첫 단어를 만들어 보세요.</p>`;
}

$('#word-list').addEventListener('click', async (e) => {
  const b = e.target.closest('.word-chip');
  if (!b) return;
  const r = await fetch(`/api/cards?letter=${encodeURIComponent(state.letter)}&mode=word&limit=300`);
  const full = ((await r.json()).cards || []).find((c) => String(c.id) === b.dataset.id);
  if (full) openSingle(full);
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

  const hasBg = !!(c.meaning && c.meaning.trim());
  $('#v-meaning').textContent = hasBg ? c.meaning : '';
  $('#v-meaning').hidden = !hasBg;

  const img = $('#v-image');
  if (c.image) { img.src = c.image; img.hidden = false; }
  else { img.removeAttribute('src'); img.alt = ''; img.hidden = true; }

  $('#v-author').textContent = `by ${nameOf(c)}`;
  $('#v-body').hidden = !state.single;
  $('#v-reveal').hidden = state.single;
  $('#v-next').hidden = state.single || state.deck.length < 2;
  $('#v-tools').innerHTML = mine(c.author)
    ? `<button class="link" data-act="edit">수정</button>
       <button class="link danger" data-act="del">삭제</button>` : '';

  $('#note-input').value = '';
  $('#note-error').textContent = '';
  state.notes = [];
  renderNotes(hasBg, !!c.image);
  if (state.single) loadNotes(c.id);
}

function renderNotes(hasBg, hasImg) {
  const host = $('#v-notes');
  host.innerHTML = state.notes.map((n) => `
    <div class="note">
      <p class="note-body">${esc(n.body)}</p>
      <div class="note-foot">
        <span>${esc(nameOf(n))}</span>
        ${mine(n.author) ? `<button class="link danger" data-note="${n.id}">삭제</button>` : ''}
      </div>
    </div>`).join('');
  $('#v-nobg').hidden = hasBg || hasImg || state.notes.length > 0;
}

async function loadNotes(cardId) {
  const r = await fetch(`/api/notes?card_id=${cardId}`);
  state.notes = (await r.json()).notes || [];
  const c = state.deck[state.deckIdx];
  renderNotes(!!(c.meaning && c.meaning.trim()), !!c.image);
}

$('#v-reveal').addEventListener('click', () => {
  $('#v-body').hidden = false;
  $('#v-reveal').hidden = true;
  const c = state.deck[state.deckIdx];
  if (c) loadNotes(c.id);
});

$('#v-next').addEventListener('click', () => {
  state.deckIdx = (state.deckIdx + 1) % state.deck.length;
  renderDeck();
});

$('#note-submit').addEventListener('click', async () => {
  const c = state.deck[state.deckIdx];
  const text = $('#note-input').value.trim();
  if (!c) return;
  if (!text) { $('#note-error').textContent = '내용을 입력해 주세요.'; return; }

  $('#note-submit').disabled = true;
  try {
    const r = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cardId: c.id, body: text,
        nickname: state.nickname, displayName: state.myName,
      }),
    });
    const data = await r.json();
    if (!r.ok) { $('#note-error').textContent = data.error || '추가에 실패했습니다.'; return; }
    $('#note-input').value = '';
    $('#note-error').textContent = '';
    await loadNotes(c.id);
  } catch {
    $('#note-error').textContent = '문제가 생겼습니다. 다시 시도해 주세요.';
  } finally {
    $('#note-submit').disabled = false;
  }
});

$('#v-notes').addEventListener('click', async (e) => {
  const id = e.target.dataset.note;
  if (!id) return;
  if (!confirm('이 배경을 삭제할까요?')) return;
  const r = await fetch(`/api/notes?id=${id}&nickname=${encodeURIComponent(state.nickname)}`,
    { method: 'DELETE' });
  if (!r.ok) { alert((await r.json()).error); return; }
  await loadNotes(state.deck[state.deckIdx].id);
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
let pendingImage = '';      // 새로 고른 사진
let removeImage = false;    // 기존 사진 삭제 여부

function setPreview(src) {
  if (src) {
    $('#img-preview').src = src;
    $('#img-preview-wrap').hidden = false;
  } else {
    $('#img-preview').removeAttribute('src');
    $('#img-preview-wrap').hidden = true;
  }
}

function openForm(card) {
  $('#card-form-title').textContent = card ? '카드 수정' : '작성';
  $('#card-id').value = card ? card.id : '';
  $('#f-word').value = card ? card.word : '';
  $('#f-name').value = card ? (card.display_name || '') : state.myName;
  $('#f-meaning').value = card ? (card.meaning || '') : '';
  $('#f-image').value = '';
  $('#img-status').textContent = '';
  $('#form-error').textContent = '';
  pendingImage = '';
  removeImage = false;
  setPreview(card && card.image ? card.image : '');
  $('#dlg-card').showModal();
}

// 브라우저에서 사진을 줄이고 압축합니다.
function compressImage(file, maxEdge = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 열 수 없습니다.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('#f-image').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    $('#img-status').textContent = '이미지 파일만 첨부할 수 있습니다.';
    e.target.value = '';
    return;
  }
  $('#img-status').textContent = '사진을 준비하는 중…';
  $('#card-submit').disabled = true;
  try {
    let data = await compressImage(file);
    if (data.length > 1_400_000) data = await compressImage(file, 900, 0.65);
    if (data.length > 1_400_000) throw new Error('사진 용량이 너무 큽니다. 더 작은 사진을 써 주세요.');
    pendingImage = data;
    removeImage = false;
    setPreview(data);
    $('#img-status').textContent = `첨부됨 (약 ${Math.round(data.length / 1024)}KB)`;
  } catch (err) {
    pendingImage = '';
    $('#img-status').textContent = err.message;
    e.target.value = '';
  } finally {
    $('#card-submit').disabled = false;
  }
});

$('#img-clear').addEventListener('click', () => {
  pendingImage = '';
  removeImage = true;
  $('#f-image').value = '';
  $('#img-status').textContent = '사진을 제거했습니다.';
  setPreview('');
});

$('#btn-write').addEventListener('click', () => openForm(null));
$('#card-cancel').addEventListener('click', () => $('#dlg-card').close());
$('#btn-nick').addEventListener('click', askNickname);

$('#form-card').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#card-id').value;
  const payload = {
    nickname: state.nickname,
    displayName: $('#f-name').value,
    word: $('#f-word').value,
    meaning: $('#f-meaning').value,
  };
  
  if (pendingImage) payload.image = pendingImage;
  if (removeImage && !pendingImage) payload.removeImage = true;

  $('#card-submit').disabled = true;
  try {
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
  } catch {
    $('#form-error').textContent = '저장 중 문제가 생겼습니다. 다시 시도해 주세요.';
  } finally {
    $('#card-submit').disabled = false;
  }
});

/* ---------- 시작 ---------- */
(function init() {
  const saved = localStorage.getItem('gsmon_nickname');
  const savedName = localStorage.getItem('gsmon_myname') || '';
  if (saved) applyIdentity(saved, savedName); else askNickname();
  switchView('scatter');
  loadStats();
})();
