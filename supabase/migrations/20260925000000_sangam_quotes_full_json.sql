-- Migration: extend sangam.quotes to hold the full booking payload as JSON.
--
-- Business rule (2026-09-25): a booking must NOT be written into the real
-- eventmgmt relational tables (booking / booking_customer /
-- booking_outdoor_details / booking_payment) until payment is actually
-- done. Payment integration doesn't exist yet, so until it does, every
-- chat-generated quote/booking -- draft AND confirmed -- is saved ONLY here,
-- in sangam.quotes, with the complete would-be-booking payload captured as
-- JSON in `booking_details`. Once payment is wired up, a confirmed row with
-- payment_status = 'paid' is what gets promoted into the eventmgmt tables.
--
-- No data is deleted by this migration -- additive columns only.

ALTER TABLE sangam.quotes
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(16),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS booking_details JSONB;

COMMENT ON COLUMN sangam.quotes.booking_details IS
  'Full payload of everything that will eventually be written into eventmgmt.booking / booking_customer / booking_outdoor_details / booking_payment, kept here as JSON until payment is completed and the row is promoted into those relational tables.';

COMMENT ON COLUMN sangam.quotes.payment_status IS
  'unpaid | paid. Only a paid row is eligible to be promoted into the eventmgmt relational tables.';

CREATE INDEX IF NOT EXISTS idx_sangam_quotes_payment_status ON sangam.quotes(payment_status);
