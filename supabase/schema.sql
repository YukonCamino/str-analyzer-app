-- ============================================================
-- STR Analyzer — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL,
  address         TEXT NOT NULL,
  region          TEXT,
  price           INTEGER,
  original_price  INTEGER,
  beds            NUMERIC,
  baths           NUMERIC,
  sqft            INTEGER,
  dom             INTEGER,
  zillow_link     TEXT,
  airbnb_link     TEXT,
  img_url         TEXT,
  annual_rev      NUMERIC DEFAULT 0,
  piti            NUMERIC,       -- monthly mortgage + tax + insurance
  down_payment    NUMERIC,       -- actual dollar amount (30% of price by default)
  has_pool        BOOLEAN DEFAULT FALSE,
  rev_source      TEXT DEFAULT 'Manual',
  sold            BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  tab_label       TEXT,          -- which tab this lives on: 'laquinta', 'bigbear', etc.
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Comps table
CREATE TABLE IF NOT EXISTS comps (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users NOT NULL,
  property_id   UUID REFERENCES properties(id) ON DELETE SET NULL,
  address       TEXT,
  listing_name  TEXT,
  annual_rev    INTEGER DEFAULT 0,
  adr           INTEGER DEFAULT 0,   -- average daily rate
  occupancy     NUMERIC DEFAULT 0,   -- 0.0 to 1.0
  rating        NUMERIC,
  reviews       INTEGER,
  airbnb_link   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE comps      ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own properties
CREATE POLICY "own_properties" ON properties
  FOR ALL USING (auth.uid() = user_id);

-- Users can only see and manage their own comps
CREATE POLICY "own_comps" ON comps
  FOR ALL USING (auth.uid() = user_id);

-- ── Auto-update updated_at ──────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
