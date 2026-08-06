# Community Library Extension — Schema & Build Plan

Extends the existing admin scanning tool (see `SYSTEM_DESIGN.md`) into the community catalogue originally scoped in a separate planning session: passcode-gated members who can browse, borrow-track their own history, and post to a blog and bulletin board — all on the **same Postgres database and Express API**, no Google Sheets, no Firebase (see rationale below).

---

## 0. Why no Sheets/Firebase

Sheets and Firebase solved two problems that don't exist here anymore:
1. *Easy data entry without code* → already solved by the existing Add Book UI (ISBN auto-fetch + barcode scan is strictly nicer than typing into a spreadsheet).
2. *Live, conflict-free availability* → already solved by Postgres being the single source of truth, with a DB-level constraint that already prevents double-borrow races (`SYSTEM_DESIGN.md` §8.3).

Adding a second data store on top would mean **two systems claiming to be the truth** and a sync job to reconcile them — strictly more failure modes, not fewer.

---

## 1. Schema changes

### 1.1 Where fields land: books vs. book_copies, revisited

The other session's plan assumed one row per physical book (no title/copy split). Ours already splits `books` (title-level) from `book_copies` (physical item). That split changes *where* a few of their fields belong:

- **Genre** → belongs on `books` (a title's genre doesn't change per copy).
- **Friendly Book ID, shelf location, notes** → belong on `book_copies`, not `books`. A physical copy is what sits on a shelf, what gets a sticker with a number on it, and what might have a bespoke note ("signed," "missing back cover"). Two copies of the same title can live on different shelves — that's only representable if these fields are per-copy.

### 1.2 New migration: `002_community_library.sql`

```sql
-- Friendly, human-facing numbering for physical copies, seeded at 2902
-- (Karan + Aagam's birth dates). Purely cosmetic — book_copies.id (UUID)
-- stays the real primary key / FK target.
CREATE SEQUENCE book_copy_display_id_seq START 2902;

ALTER TABLE book_copies
  ADD COLUMN display_id INTEGER UNIQUE DEFAULT nextval('book_copy_display_id_seq'),
  ADD COLUMN shelf_location TEXT,
  ADD COLUMN notes TEXT;

-- Backfill existing copies (from the admin-tool smoke testing) in insertion order.
UPDATE book_copies SET display_id = nextval('book_copy_display_id_seq')
  WHERE display_id IS NULL;
-- (then ALTER COLUMN display_id SET NOT NULL once backfilled)

-- Genres: many-to-many, not capped at 3 like the spreadsheet's Genre1/2/3 —
-- same idea, cleaner to query, and the UI can still cap picker selection at
-- 3 if we want to preserve that simplicity.
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE book_genres (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

-- Members become real authenticated accounts, not just borrower contact
-- records the admin looks up.
ALTER TABLE members
  ADD COLUMN passcode_hash TEXT;

-- Freestanding posts — no FK to books, by deliberate choice ("keep them
-- freestanding initially to avoid glitches").
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    title TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

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
```

This is purely additive — the existing admin tool keeps working unmodified throughout the migration.

---

## 2. Auth: two roles, one JWT scheme

Extend the existing JWT approach (already proven in production) with a `role` claim instead of building a parallel system:

- **Admin**: unchanged — env-configured email/password, `role: "admin"`.
- **Member**: new — `POST /api/member-auth/login { name, passcode }` looks up by name, verifies `passcode_hash` (bcrypt, same pattern as the admin password), issues a `role: "member"` token with the member's id.
- `requireAuth` middleware becomes role-aware: `requireAdmin` for admin-only routes (existing ones, unchanged), `requireMember` for the new member routes, each checking the JWT's `role` claim.

**Open question**: login is "type your name freely," not select-from-list. If two members ever share a name, name+passcode alone can't disambiguate. Fine for a small trusted circle now — worth remembering as a known limitation if the circle grows, not worth solving preemptively.

**Passcode generation**: when admin adds a member, generate a short numeric code (e.g. 4 digits), hash it, show the plaintext once to the admin to relay manually (no email/SMS — matches "passive, no active notifications" preference already set elsewhere).

---

## 3. New API surface

Member-facing (behind `requireMember`):
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/member-auth/login` | name + passcode → JWT |
| GET | `/api/member-auth/me` | session check |
| GET | `/api/catalogue?q=&genre=&author=` | browse/search, read-only, shows availability per copy |
| GET | `/api/genres` | for filter UI |
| GET | `/api/my-loans` | own current + past loans ("library card") |
| GET/POST | `/api/blog` | feed / create post |
| PATCH/DELETE | `/api/blog/:id` | author or admin only |
| GET/POST | `/api/bulletin` | feed / create post |
| PATCH/DELETE | `/api/bulletin/:id` | author or admin only |

Admin-facing (extends existing routes, behind `requireAdmin`):
- `POST /api/books` and copy endpoints gain `genreIds[]`, `shelfLocation`, `notes`.
- `POST /api/members` now generates and returns a passcode.
- New: `GET/POST/DELETE /api/genres` for managing the genre list.
- Blog/bulletin moderation: admin can delete any post, not just their own.

---

## 4. Frontend

One React app, two route trees, two `AuthContext`s (`AdminAuthContext` already exists; add a parallel `MemberAuthContext`) — simpler to maintain than a second deployable, and both already share the pink pastel theme.

New pages: `MemberLoginPage`, `CataloguePage` (search/filter by title/author/genre, availability badge), `MyCardPage` (current + past loans), `BlogPage` (feed + composer), `BulletinPage` (feed + composer with optional date/time/location).

---

## 5. Open decision: loan duration model

Current admin tool: admin picks a duration per loan (7/14/21/30 days); "due soon" = within 2 days of that due date.

Original community-library spec: fixed 14-day window used only to compute a passive overdue flag; return allowed anytime regardless.

These aren't the same rule. Two ways to reconcile — **your call, not mine to assume**:
- **(a) Simplify to match the original spec**: drop the duration picker entirely, always `due_at = borrowed_at + 14 days`. One rule, matches what was originally decided, less UI.
- **(b) Keep admin flexibility, add a separate member-facing rule**: admin keeps picking any duration; the member's "my card" view independently flags anything unreturned past 14 days regardless of the admin-chosen due date. Two rules coexisting, more flexible but more to explain.

---

## 6. Build order

1. Migration `002_community_library.sql` (genres, book_copies additions + backfill, members.passcode_hash, blog_posts, bulletin_posts).
2. Member auth (passcode login, role-aware middleware).
3. Admin UI: genre picker + shelf/notes fields on Add Book; passcode reveal on Add Member.
4. Member catalogue browse/search (read-only).
5. "My card" (own loan history).
6. Blog (post + feed + moderation).
7. Bulletin board (same pattern + optional event fields).
8. Resolve the loan-duration decision (§5) and implement.
9. End-to-end pass through the full member journey (login → browse → see own card → post to blog/bulletin), plus a site name/theme pass across the new surfaces.
