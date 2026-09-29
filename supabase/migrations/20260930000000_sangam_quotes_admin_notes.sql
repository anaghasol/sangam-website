-- Migration: add admin_notes to sangam.quotes.
--
-- Business context: pwa-team-connect (Sangam Team Connect admin app) now has
-- a Leads page (views/leads/*) that lets admins with the
-- "admin:catering_data:manage" permission view and edit quotes captured by
-- this site's AI catering chat. admin_notes is internal-only follow-up
-- context an admin adds while working a lead — never shown to the customer,
-- never written by the chat/booking flow itself.
--
-- Access to this table remains service_role only (see
-- 20260921000000_expose_sangam_schema.sql in the workmanager monorepo); the
-- Team Connect app reaches it exclusively through its `leads-api` Supabase
-- Edge Function, never directly from the browser.

ALTER TABLE sangam.quotes
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

COMMENT ON COLUMN sangam.quotes.admin_notes IS
  'Internal follow-up notes added by Team Connect admins working the lead. Never shown to the customer.';
