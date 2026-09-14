const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const MERGE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };

// 단어의 첫 글자로 인덱스를 결정합니다. 한글은 초성, 영문은 대문자, 나머지는 '#'.
export function letterOf(word) {
  const ch = (word || '').trim().charAt(0);
  if (!ch) return '#';
  const code = ch.charCodeAt(0);

  if (code >= 0xac00 && code <= 0xd7a3) {           // 가 ~ 힣
    const cho = CHO[Math.floor((code - 0xac00) / 588)];
    return MERGE[cho] || cho;
  }
  if (code >= 0x3131 && code <= 0x314e) {           // ㄱ ~ ㅎ 단독 입력
    return MERGE[ch] || (CHO.includes(ch) ? ch : '#');
  }
  const up = ch.toUpperCase();
  return /^[A-Z]$/.test(up) ? up : '#';
}

// 닉네임에 admin이 포함되면 관리자
export function isAdmin(nickname) {
  return typeof nickname === 'string' && nickname.toLowerCase().includes('admin');
}

export function canEdit(nickname, author) {
  if (!nickname) return false;
  return isAdmin(nickname) || nickname.toLowerCase() === String(author).toLowerCase();
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const oneLine = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const block = (s, max) => String(s ?? '').trim().slice(0, max);
export const nameOf = (card) =>
  (card.display_name && card.display_name.trim()) || card.author;

