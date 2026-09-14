CREATE TABLE cards (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  word         TEXT NOT NULL,
  meaning      TEXT NOT NULL,
  example      TEXT DEFAULT '',
  letter       TEXT NOT NULL,
  author       TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  image        TEXT DEFAULT '',
  display_name TEXT DEFAULT ''
);
CREATE INDEX idx_cards_letter ON cards(letter);
CREATE INDEX idx_cards_author ON cards(author);

CREATE TABLE notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id      INTEGER NOT NULL,
  body         TEXT NOT NULL,
  author       TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_card ON notes(card_id);
