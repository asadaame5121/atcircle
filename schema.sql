DROP TABLE IF EXISTS antenna_items;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  did TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_did TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rss_url TEXT,
  is_active INTEGER DEFAULT 1,
  acceptance_policy TEXT DEFAULT 'manual',
  atproto_status TEXT DEFAULT 'open',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_did) REFERENCES users(did)
);

CREATE TABLE antenna_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE INDEX idx_sites_user_did ON sites(user_did);
CREATE INDEX idx_antenna_items_site_id ON antenna_items(site_id);
CREATE INDEX idx_antenna_items_published_at ON antenna_items(published_at DESC);

CREATE TABLE oauth_states (
  key TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE rings (
  uri TEXT PRIMARY KEY,
  owner_did TEXT NOT NULL,
  admin_did TEXT,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_policy TEXT DEFAULT 'manual',
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE join_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ring_uri TEXT NOT NULL,
  user_did TEXT NOT NULL,
  site_url TEXT NOT NULL,
  site_title TEXT NOT NULL,
  rss_url TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  atproto_uri TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (ring_uri) REFERENCES rings(uri),
  UNIQUE (ring_uri, user_did)
);

CREATE TABLE memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ring_uri TEXT NOT NULL,
  site_id INTEGER NOT NULL,
  member_uri TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'approved',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (ring_uri) REFERENCES rings(uri),
  FOREIGN KEY (site_id) REFERENCES sites(id),
  UNIQUE (ring_uri, site_id)
);

CREATE INDEX idx_memberships_ring_uri ON memberships(ring_uri);
CREATE INDEX idx_memberships_site_id ON memberships(site_id);
