-- Friendly, human-facing numbering for physical copies, seeded at 2902
-- (Karan + Aagam's birth dates combined). Purely cosmetic — book_copies.id
-- (UUID) remains the real primary key / FK target used everywhere else.
CREATE SEQUENCE book_copy_display_id_seq START 2902;

ALTER TABLE book_copies
  ADD COLUMN display_id INTEGER UNIQUE,
  ADD COLUMN shelf_location TEXT,
  ADD COLUMN notes TEXT;

-- Backfill any copies that existed before this migration, oldest first, so
-- they get sequential numbers before the sequence is used for new inserts.
UPDATE book_copies
SET display_id = nextval('book_copy_display_id_seq')
WHERE display_id IS NULL;

ALTER TABLE book_copies
  ALTER COLUMN display_id SET DEFAULT nextval('book_copy_display_id_seq'),
  ALTER COLUMN display_id SET NOT NULL;

-- Genres: many-to-many. Same idea as the spreadsheet's Genre1/2/3 columns,
-- but not capped at 3 and far easier to query/filter by.
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE book_genres (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);
CREATE INDEX idx_book_genres_genre_id ON book_genres (genre_id);

-- Members become real authenticated accounts (name + passcode login),
-- not just borrower contact records the admin looks up.
ALTER TABLE members
  ADD COLUMN passcode_hash TEXT;

-- Freestanding posts (no FK to books, by deliberate choice — avoids
-- coupling the social layer to catalogue edits/deletes).
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    title TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX idx_blog_posts_created_at ON blog_posts (created_at DESC);

CREATE TABLE bulletin_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT,
    event_date DATE,
    event_time TIME,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX idx_bulletin_posts_created_at ON bulletin_posts (created_at DESC);
