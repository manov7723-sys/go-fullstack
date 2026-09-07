-- Library Management System — Database Initialization
-- Idempotent: safe to run on a database that already has data.

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enum types (idempotent) ─────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'librarian');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM ('active', 'fulfilled', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_category AS ENUM ('borrow', 'reservation', 'fine', 'book', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    role          user_role DEFAULT 'user',
    is_active     BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS books (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    author           VARCHAR(255) NOT NULL,
    isbn             VARCHAR(20) UNIQUE NOT NULL,
    category         VARCHAR(100) NOT NULL,
    published_date   DATE,
    description      TEXT,
    total_copies     INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMPTZ,
    CONSTRAINT chk_available_copies CHECK (available_copies >= 0),
    CONSTRAINT chk_total_copies     CHECK (total_copies >= available_copies)
);

CREATE TABLE IF NOT EXISTS borrows (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrowed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    due_date    DATE NOT NULL,
    returned_at TIMESTAMPTZ,
    fine_amount DECIMAL(10,2) DEFAULT 0,
    status      VARCHAR(20) DEFAULT 'borrowed'
                    CHECK (status IN ('borrowed', 'returned', 'overdue')),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reservations (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id          BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    reservation_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at       TIMESTAMPTZ NOT NULL,
    status           reservation_status DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fines (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    borrow_id  BIGINT NOT NULL REFERENCES borrows(id) ON DELETE CASCADE,
    amount     DECIMAL(10,2) NOT NULL,
    reason     TEXT NOT NULL,
    due_date   TIMESTAMPTZ NOT NULL,
    is_paid    BOOLEAN DEFAULT false,
    paid_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    type        notification_type NOT NULL,
    category    notification_category NOT NULL,
    is_read     BOOLEAN DEFAULT false,
    entity_id   BIGINT,
    entity_type VARCHAR(50),
    action_url  VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMPTZ
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active     ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_books_title      ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author     ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_isbn       ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_category   ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_available  ON books(available_copies);

CREATE INDEX IF NOT EXISTS idx_borrows_user_id      ON borrows(user_id);
CREATE INDEX IF NOT EXISTS idx_borrows_book_id      ON borrows(book_id);
CREATE INDEX IF NOT EXISTS idx_borrows_due_date     ON borrows(due_date);
CREATE INDEX IF NOT EXISTS idx_borrows_returned_at  ON borrows(returned_at);
CREATE INDEX IF NOT EXISTS idx_borrows_status       ON borrows(status);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id    ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id    ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at);

CREATE INDEX IF NOT EXISTS idx_fines_user_id   ON fines(user_id);
CREATE INDEX IF NOT EXISTS idx_fines_borrow_id ON fines(borrow_id);
CREATE INDEX IF NOT EXISTS idx_fines_is_paid   ON fines(is_paid);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- ─── Auto-update trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_users_updated_at         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_books_updated_at         BEFORE UPDATE ON books         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_borrows_updated_at       BEFORE UPDATE ON borrows       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_reservations_updated_at  BEFORE UPDATE ON reservations  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_fines_updated_at         BEFORE UPDATE ON fines         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Seed data ────────────────────────────────────────────────────────────────
-- Passwords:
--   admin@library.com      → Admin123!
--   librarian@library.com  → Librarian123!
--   john.doe@email.com     → User123!  (same hash for all regular users)

INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
VALUES
    ('admin@library.com',     '$2a$10$WjJbfRyTkvHq1Ixn.N0PG.Pe38piGwmjhEItt.astiTy3VsvJC7fi', 'Admin',  'User',      'admin',     true),
    ('librarian@library.com', '$2a$10$rewJADafv.2UL6i.sWeF1e1blMHBxYD9nvo2dcEKy97XEG.pOowYe', 'Jane',   'Librarian', 'librarian', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, first_name, last_name, phone, email_verified)
VALUES
    ('john.doe@email.com',    '$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'John',   'Doe',     '+1-555-0101', true),
    ('jane.smith@email.com',  '$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'Jane',   'Smith',   '+1-555-0102', true),
    ('mike.johnson@email.com','$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'Mike',   'Johnson', '+1-555-0103', true),
    ('sarah.wilson@email.com','$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'Sarah',  'Wilson',  '+1-555-0104', true),
    ('david.brown@email.com', '$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'David',  'Brown',   '+1-555-0105', true),
    ('emily.davis@email.com', '$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'Emily',  'Davis',   '+1-555-0106', true),
    ('chris.lee@email.com',   '$2a$10$jtkcz6VgN/OM33FbvVNAo.XE4QLFXuQ9UbfD9YT8RiwpUgynVfTDu', 'Chris',  'Lee',     '+1-555-0107', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO books (title, author, isbn, category, published_date, description, total_copies, available_copies)
VALUES
    -- Fiction
    ('To Kill a Mockingbird',          'Harper Lee',         '978-0-06-112008-4', 'Fiction',     '1960-07-11', 'A gripping tale of racial injustice and childhood innocence in the American South.', 5, 3),
    ('1984',                           'George Orwell',      '978-0-452-28423-4', 'Fiction',     '1949-06-08', 'A dystopian novel exploring totalitarianism, surveillance, and the erosion of truth.', 4, 2),
    ('Pride and Prejudice',            'Jane Austen',        '978-0-14-143951-8', 'Fiction',     '1813-01-28', 'A witty exploration of manners, marriage, and morality in Regency-era England.', 3, 3),
    ('The Great Gatsby',               'F. Scott Fitzgerald','978-0-7432-7356-5', 'Fiction',     '1925-04-10', 'A critique of the American Dream set against the glittering excess of the Jazz Age.', 4, 1),
    ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling','978-0-439-70818-8','Fiction',    '1997-06-26', 'A young boy discovers he is a wizard and begins his education at Hogwarts.', 6, 4),
    ('The Catcher in the Rye',         'J.D. Salinger',      '978-0-316-76948-0', 'Fiction',     '1951-07-16', 'A teenager''s poignant journey through New York City during a few days of self-discovery.', 3, 2),
    ('Brave New World',                'Aldous Huxley',      '978-0-06-085052-4', 'Fiction',     '1932-08-18', 'A prescient vision of a future society controlled through pleasure and conditioning.', 3, 3),

    -- Non-Fiction
    ('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari','978-0-06-231609-7','Non-Fiction','2011-01-01','A sweeping narrative of humanity''s creation and evolution.', 4, 4),
    ('Educated',                       'Tara Westover',      '978-0-399-59050-4', 'Non-Fiction', '2018-02-20', 'A memoir about a woman who grows up in a survivalist family and later earns a PhD.', 3, 2),
    ('The Immortal Life of Henrietta Lacks','Rebecca Skloot','978-1-4000-5217-2','Non-Fiction','2010-02-02','The story of the woman behind the HeLa cells that revolutionised medical research.', 2, 2),

    -- Science & Technology
    ('A Brief History of Time',        'Stephen Hawking',    '978-0-553-38016-3', 'Science',     '1988-04-01', 'An exploration of cosmology, from the Big Bang to black holes, for general readers.', 4, 3),
    ('The Selfish Gene',               'Richard Dawkins',    '978-0-19-286092-7', 'Science',     '1976-01-01', 'A landmark work arguing that genes, not organisms, are the units of natural selection.', 3, 3),
    ('Clean Code',                     'Robert C. Martin',   '978-0-13-235088-4', 'Technology',  '2008-08-11', 'A practical guide to writing readable, maintainable software.', 5, 4),
    ('The Pragmatic Programmer',       'David Thomas',       '978-0-13-595705-9', 'Technology',  '1999-10-20', 'Timeless advice for software developers on craftsmanship and effectiveness.', 4, 4),
    ('Designing Data-Intensive Applications','Martin Kleppmann','978-1-4493-7310-8','Technology','2017-03-16','A deep dive into the principles behind reliable, scalable, and maintainable systems.', 3, 3),

    -- History
    ('Guns, Germs, and Steel',         'Jared Diamond',      '978-0-393-31755-8', 'History',     '1997-01-01', 'An exploration of why certain civilisations came to dominate others.', 3, 2),
    ('The Diary of a Young Girl',      'Anne Frank',         '978-0-553-29698-8', 'History',     '1947-06-25', 'The wartime diary of a Jewish teenager hiding in Amsterdam during the Nazi occupation.', 4, 4),

    -- Biography
    ('Steve Jobs',                     'Walter Isaacson',    '978-1-4516-4853-9', 'Biography',   '2011-10-24', 'The definitive biography of Apple''s co-founder, based on exclusive interviews.', 3, 2),
    ('Long Walk to Freedom',           'Nelson Mandela',     '978-0-316-54585-6', 'Biography',   '1994-10-01', 'The autobiography of Nelson Mandela, from his childhood to his presidency.', 2, 2)
ON CONFLICT (isbn) DO NOTHING;
