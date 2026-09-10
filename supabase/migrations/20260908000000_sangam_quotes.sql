-- Migration: Create sangam.quotes table for storing catering & banquet customer quotes

CREATE TABLE IF NOT EXISTS sangam.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(32) NOT NULL UNIQUE,
  whatsapp_phone VARCHAR(32) NOT NULL,
  guest_count INT,
  event_type VARCHAR(64),
  event_date VARCHAR(64),
  dishes TEXT,
  total_amount NUMERIC(10, 2),
  valid_until TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on whatsapp_phone and quote_number
CREATE INDEX IF NOT EXISTS idx_sangam_quotes_whatsapp ON sangam.quotes(whatsapp_phone);
CREATE INDEX IF NOT EXISTS idx_sangam_quotes_number ON sangam.quotes(quote_number);
