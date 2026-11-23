CREATE TABLE users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('client','pro','admin')),
 is_demo INTEGER NOT NULL DEFAULT 0, disabled INTEGER NOT NULL DEFAULT 0,
 session_version INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
);
CREATE TABLE trades (id TEXT PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO trades VALUES ('plumbing','Fontanería');
CREATE TABLE professionals (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), slug TEXT NOT NULL UNIQUE,
 trade_id TEXT NOT NULL DEFAULT 'plumbing' REFERENCES trades(id), name TEXT NOT NULL, specialty TEXT NOT NULL,
 bio TEXT NOT NULL, experience INTEGER NOT NULL DEFAULT 0 CHECK(experience BETWEEN 0 AND 70),
 remote INTEGER NOT NULL DEFAULT 0, min_notice INTEGER NOT NULL DEFAULT 120 CHECK(min_notice >= 0),
 gap INTEGER NOT NULL DEFAULT 15 CHECK(gap BETWEEN 0 AND 120), cancel_hours INTEGER NOT NULL DEFAULT 24,
 auto_confirm INTEGER NOT NULL DEFAULT 0, is_demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE coverage_areas (id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), name TEXT NOT NULL);
CREATE TABLE services (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', price_cents INTEGER CHECK(price_cents >= 0),
 price_type TEXT NOT NULL CHECK(price_type IN ('from','fixed','diagnosis')),
 duration INTEGER NOT NULL CHECK(duration BETWEEN 15 AND 480), mode TEXT NOT NULL CHECK(mode IN ('onsite','remote')),
 requirements TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE availability (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), weekday INTEGER NOT NULL CHECK(weekday BETWEEN 1 AND 7),
 start_minute INTEGER NOT NULL CHECK(start_minute BETWEEN 0 AND 1439), end_minute INTEGER NOT NULL CHECK(end_minute BETWEEN 1 AND 1440),
 CHECK(end_minute > start_minute), UNIQUE(professional_id,weekday,start_minute)
);
CREATE TABLE availability_exceptions (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), starts_at INTEGER NOT NULL,
 ends_at INTEGER NOT NULL, reason TEXT NOT NULL, CHECK(ends_at > starts_at)
);
CREATE TABLE own_clients (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), name TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE requests (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id), professional_id TEXT NOT NULL REFERENCES professionals(id),
 title TEXT NOT NULL, description TEXT NOT NULL, symptoms TEXT NOT NULL DEFAULT '[]', mode TEXT NOT NULL CHECK(mode IN ('onsite','remote')),
 status TEXT NOT NULL CHECK(status IN ('new','discussion','inspection','quoted','accepted','booked','completed','cancelled')),
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE conversations (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE REFERENCES requests(id));
CREATE TABLE messages (
 id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id), sender_id TEXT NOT NULL REFERENCES users(id),
 body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE attachments (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), message_id TEXT REFERENCES messages(id),
 uploader_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, storage_name TEXT NOT NULL UNIQUE,
 mime TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE quotes (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), version INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('sent','accepted','rejected','superseded')), notes TEXT NOT NULL DEFAULT '',
 total_cents INTEGER NOT NULL CHECK(total_cents >= 0), created_at INTEGER NOT NULL, UNIQUE(request_id,version)
);
CREATE TABLE quote_lines (
 id TEXT PRIMARY KEY, quote_id TEXT NOT NULL REFERENCES quotes(id), description TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity > 0), unit_cents INTEGER NOT NULL CHECK(unit_cents >= 0)
);
CREATE TABLE bookings (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), client_id TEXT REFERENCES users(id),
 own_client_id TEXT REFERENCES own_clients(id), request_id TEXT REFERENCES requests(id), service_id TEXT REFERENCES services(id),
 starts_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, busy_until INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','confirmed','completed','cancelled')),
 source TEXT NOT NULL CHECK(source IN ('marketplace','own')), commission_bps INTEGER NOT NULL,
 title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', cancellation_reason TEXT,
 amount_cents INTEGER CHECK(amount_cents >= 0), collection_status TEXT NOT NULL DEFAULT 'unrecorded' CHECK(collection_status IN ('unrecorded','pending','recorded')),
 created_at INTEGER NOT NULL, CHECK(ends_at > starts_at), CHECK(busy_until >= ends_at),
 CHECK((source = 'own' AND own_client_id IS NOT NULL AND client_id IS NULL AND commission_bps = 0) OR (source = 'marketplace' AND client_id IS NOT NULL AND own_client_id IS NULL AND commission_bps = 800))
);
CREATE TABLE completed_jobs (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id), summary TEXT NOT NULL, completed_at INTEGER NOT NULL);
CREATE TABLE portfolio (
 id TEXT PRIMARY KEY, professional_id TEXT NOT NULL REFERENCES professionals(id), title TEXT NOT NULL, description TEXT NOT NULL, is_demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE reviews (
 id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id), author_id TEXT NOT NULL REFERENCES users(id),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE incidents (
 id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id), opened_by TEXT NOT NULL REFERENCES users(id),
 title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','reviewing','closed')), created_at INTEGER NOT NULL
);
CREATE TABLE incident_responses (
 id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id), author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE status_history (
 id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id),
 from_status TEXT, to_status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE notifications (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), request_id TEXT REFERENCES requests(id),
 body TEXT NOT NULL, read_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE INDEX idx_bookings_calendar ON bookings(professional_id,status,starts_at,busy_until);
CREATE INDEX idx_requests_client ON requests(client_id,updated_at);
CREATE INDEX idx_requests_professional ON requests(professional_id,updated_at);
CREATE INDEX idx_messages_conversation ON messages(conversation_id,created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id,read_at);
CREATE INDEX idx_exceptions_calendar ON availability_exceptions(professional_id,starts_at,ends_at);
CREATE INDEX idx_history_entity ON status_history(entity_type,entity_id,created_at);
CREATE TRIGGER booking_no_overlap_insert BEFORE INSERT ON bookings
WHEN NEW.status IN ('pending','confirmed') AND EXISTS (
 SELECT 1 FROM bookings WHERE professional_id = NEW.professional_id AND status IN ('pending','confirmed')
 AND starts_at < NEW.busy_until AND busy_until > NEW.starts_at
) BEGIN SELECT RAISE(ABORT,'BOOKING_OVERLAP'); END;
CREATE TRIGGER booking_no_overlap_update BEFORE UPDATE ON bookings
WHEN NEW.status IN ('pending','confirmed') AND EXISTS (
 SELECT 1 FROM bookings WHERE id <> NEW.id AND professional_id = NEW.professional_id AND status IN ('pending','confirmed')
 AND starts_at < NEW.busy_until AND busy_until > NEW.starts_at
) BEGIN SELECT RAISE(ABORT,'BOOKING_OVERLAP'); END;
