DROP TABLE IF EXISTS cards;
CREATE TABLE cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  word       TEXT NOT NULL,
  meaning    TEXT NOT NULL,
  example    TEXT DEFAULT '',
  letter     TEXT NOT NULL,
  author     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cards_letter ON cards(letter);
CREATE INDEX idx_cards_author ON cards(author);

INSERT INTO cards (word, meaning, example, letter, author) VALUES
 ('Apple',  '사과',            'She ate a red apple.',   'A', 'admin'),
 ('Zeal',   '열정',            'He worked with zeal.',   'Z', 'admin'),
 ('가로등', '길가에 세운 등',   '가로등이 하나둘 켜졌다.', 'ㄱ', 'admin'),
 ('바람',   '공기의 흐름',      '바람이 몹시 분다.',      'ㅂ', 'admin'),
 ('빗물',   '비가 되어 내린 물', '빗물이 고였다.',        'ㅂ', 'admin');