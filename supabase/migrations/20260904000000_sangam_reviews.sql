CREATE TABLE IF NOT EXISTS sangam_reviews (
  id           BIGSERIAL PRIMARY KEY,
  author       TEXT NOT NULL,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT NOT NULL,
  time_desc    TEXT,
  branch       TEXT NOT NULL,
  branch_id    TEXT NOT NULL,
  fetched_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(author, branch_id, text)
);

CREATE INDEX IF NOT EXISTS idx_sangam_reviews_branch_id ON sangam_reviews(branch_id);
CREATE INDEX IF NOT EXISTS idx_sangam_reviews_rating    ON sangam_reviews(rating);
