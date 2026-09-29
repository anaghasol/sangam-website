-- Migration: log every chat conversation/session for analytics, independent
-- of whether a quote is ever saved.
--
-- Business context: sangam.quotes only ever gets a row once a customer has
-- given a phone number AND (as of the 2026-09-27 tightening in
-- app/api/chat/route.ts) explicitly confirmed. That means the large
-- majority of chat traffic -- browsing, asking about menus/halls, abandoned
-- conversations -- was never persisted anywhere. This table captures the
-- full transcript of every session so it can be mined later (drop-off
-- points, popular questions, language mix, conversion funnel), regardless
-- of whether a quote/booking ever happens.
--
-- One row per browser/embed session (sangam.chat_sessions), with the full
-- message array appended to as the conversation grows, plus a denormalized
-- last_* set of columns for cheap filtering/analytics without unpacking the
-- JSON. No PII beyond what the customer already typed into the chat itself
-- (phone/name/address), matching what's already stored in sangam.quotes.

CREATE TABLE IF NOT EXISTS sangam.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(64) NOT NULL UNIQUE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  last_language VARCHAR(8),
  last_service_type VARCHAR(16),
  detected_phone VARCHAR(32),
  detected_branch VARCHAR(64),
  quote_number VARCHAR(32),
  quote_saved BOOLEAN NOT NULL DEFAULT FALSE,
  first_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sangam_chat_sessions_phone ON sangam.chat_sessions(detected_phone);
CREATE INDEX IF NOT EXISTS idx_sangam_chat_sessions_quote_number ON sangam.chat_sessions(quote_number);
CREATE INDEX IF NOT EXISTS idx_sangam_chat_sessions_last_message_at ON sangam.chat_sessions(last_message_at DESC);

COMMENT ON TABLE sangam.chat_sessions IS
  'Full transcript log of every chat session (indoor + outdoor catering assistant), written on every turn regardless of whether a quote is ever saved. sangam.quotes remains the source of truth for confirmed quotes only.';
