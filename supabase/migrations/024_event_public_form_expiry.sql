-- ================================================================
-- EcoWise: expirable public-form tokens
-- Migration: 024_event_public_form_expiry
-- ================================================================
--
-- Adds an `expires_at` to `EventPublicForms` so a leaked URL can be
-- rejected after the event closes instead of staying live forever
-- (BR-08 mentions signed-token expiry; the field was missing). Default
-- value for existing rows is computed from the parent event's
-- `end_date + INTERVAL '7 days'` as a sensible grace window; rows
-- whose event is already gone fall through to NULL = no expiry yet
-- and the form-builder UI can backfill on next edit.
--
-- The submit route checks `expires_at IS NULL OR expires_at > now()`;
-- expired tokens collapse to FORM_NOT_PUBLISHED so we never confirm
-- existence by accident.
--
-- Idempotent: safe to re-run.

ALTER TABLE public."EventPublicForms"
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public."EventPublicForms" f
   SET expires_at = (e.end_date::timestamptz + INTERVAL '7 days')
  FROM public."Events" e
 WHERE f.event_id = e.id
   AND f.expires_at IS NULL
   AND e.end_date IS NOT NULL;

COMMENT ON COLUMN public."EventPublicForms".expires_at IS
  'Optional cut-off after which the public token is rejected by the submit endpoint. Falls back to event.end_date + 7 days when first issued; NULL = no expiry (legacy rows / draft).';

-- Lookup by token + expiry on every submission — make it cheap.
CREATE INDEX IF NOT EXISTS event_public_forms_token_status_expiry_idx
  ON public."EventPublicForms" (token, status, expires_at);
