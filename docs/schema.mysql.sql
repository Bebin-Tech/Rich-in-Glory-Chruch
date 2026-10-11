CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> b8a74b0ca36f

CREATE TABLE church_settings (
    id INTEGER NOT NULL AUTO_INCREMENT,
    data JSON,
    PRIMARY KEY (id)
);

CREATE TABLE contact_enquiries (
    id INTEGER NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(254) NOT NULL,
    message TEXT NOT NULL,
    consent BOOL NOT NULL,
    status VARCHAR(20),
    created_at DATETIME,
    PRIMARY KEY (id)
);

CREATE INDEX ix_contact_enquiries_created_at ON contact_enquiries (created_at);

CREATE TABLE content (
    id INTEGER NOT NULL AUTO_INCREMENT,
    module VARCHAR(30) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ta VARCHAR(255),
    body_en TEXT,
    body_ta TEXT,
    category VARCHAR(100),
    status VARCHAR(20),
    publish_at VARCHAR(10),
    sort_order INTEGER,
    data JSON,
    parent_id INTEGER,
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY(parent_id) REFERENCES content (id) ON DELETE SET NULL
);

CREATE INDEX ix_content_category ON content (category);

CREATE INDEX ix_content_module ON content (module);

CREATE INDEX ix_content_publish_at ON content (publish_at);

CREATE INDEX ix_content_status ON content (status);

CREATE TABLE prayer_requests (
    id INTEGER NOT NULL AUTO_INCREMENT,
    name VARCHAR(100),
    contact VARCHAR(254),
    category VARCHAR(100),
    message TEXT NOT NULL,
    consent BOOL NOT NULL,
    status VARCHAR(20),
    created_at DATETIME,
    PRIMARY KEY (id)
);

CREATE INDEX ix_prayer_requests_created_at ON prayer_requests (created_at);

CREATE INDEX ix_prayer_requests_status ON prayer_requests (status);

CREATE TABLE users (
    id INTEGER NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    created_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE (email)
);

CREATE TABLE audit_logs (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(100) NOT NULL,
    created_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE event_registrations (
    id INTEGER NOT NULL AUTO_INCREMENT,
    event_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(254) NOT NULL,
    created_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY(event_id) REFERENCES content (id) ON DELETE CASCADE,
    UNIQUE (event_id, contact)
);

CREATE INDEX ix_event_registrations_event_id ON event_registrations (event_id);

CREATE TABLE reading_progress (
    id INTEGER NOT NULL AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    reading_id INTEGER NOT NULL,
    completed_at DATETIME,
    PRIMARY KEY (id),
    FOREIGN KEY(reading_id) REFERENCES content (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (user_id, reading_id)
);

CREATE INDEX ix_reading_progress_user_id ON reading_progress (user_id);

INSERT INTO alembic_version (version_num) VALUES ('b8a74b0ca36f');
