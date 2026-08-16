-- Achievement rarity counters.
--
-- The composite primary key on `unlocks` is what makes dedupe structural: a
-- replayed POST is a no-op, so the client never has to be trusted to send each
-- achievement exactly once. Counting distinct visitors (rather than raw
-- increments) is also what makes the displayed percentage mean something.

CREATE TABLE IF NOT EXISTS unlocks (
  visitor     TEXT NOT NULL,
  achievement TEXT NOT NULL,
  PRIMARY KEY (visitor, achievement)
);

CREATE TABLE IF NOT EXISTS visitors (
  visitor    TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL
);

-- Serves the GROUP BY in GET /rarity without a full scan.
CREATE INDEX IF NOT EXISTS idx_unlocks_achievement ON unlocks (achievement);
