-- Enables gen_random_uuid() for primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A title-level record ("Clean Code"). Not borrowable by itself.
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_books_isbn ON books (isbn);

-- A physical item on the shelf. Carries its own QR and its own borrow status.
CREATE TABLE book_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    qr_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'retired')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_book_copies_book_id ON book_copies (book_id);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_name ON members (lower(name));
CREATE INDEX idx_members_phone ON members (phone);

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_copy_id UUID NOT NULL REFERENCES book_copies(id),
    member_id UUID NOT NULL REFERENCES members(id),
    duration_days INT NOT NULL CHECK (duration_days > 0),
    borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ
);
CREATE INDEX idx_loans_due_at ON loans (due_at) WHERE returned_at IS NULL;
CREATE INDEX idx_loans_member_id ON loans (member_id);

-- Correctness constraint, not just a performance index: the database itself
-- refuses a second concurrent open loan on the same copy, no matter how the
-- app races. See SYSTEM_DESIGN.md section 8.3.
CREATE UNIQUE INDEX uq_loans_one_active_per_copy ON loans (book_copy_id) WHERE returned_at IS NULL;

-- Append-only audit trail. Never UPDATE or DELETE a row here.
CREATE TABLE scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('book_ingest', 'lend', 'return', 'unresolved')),
    scanned_code TEXT NOT NULL,
    book_copy_id UUID REFERENCES book_copies(id),
    loan_id UUID REFERENCES loans(id),
    raw_payload JSONB,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scan_logs_scanned_at ON scan_logs (scanned_at DESC);
