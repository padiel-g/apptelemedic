-- SQLite Migration (Apply selectively if not dropping DB)

-- Add condition to patients
ALTER TABLE patients ADD COLUMN condition TEXT;

-- Add readings fields
ALTER TABLE readings ADD COLUMN bp_sys INTEGER;
ALTER TABLE readings ADD COLUMN bp_dia INTEGER;
ALTER TABLE readings ADD COLUMN source TEXT DEFAULT 'device' CHECK(source IN ('device', 'manual'));
ALTER TABLE readings ADD COLUMN notes TEXT;

-- (Messages and Alerts tables are created newly as defined in schema.sql)
