-- ================================================================
-- EcoWise: actor attribution for service-role audit log writes
-- Migration: 027_audit_actor_context
-- ================================================================
--
-- The generic `audit_table_change` trigger writes one row per mutation
-- and stamps `actor_user_id := auth.uid()`. That works for end-user
-- mutations (their JWT carries the claim) but every service-role write
-- — which is most of the app — produces `actor_user_id = NULL`. BR-16
-- requires the actor to be known.
--
-- This migration teaches the trigger to look for an explicit
-- `app.actor_id` PostgreSQL setting first; if present (and parseable as
-- a UUID), that's the actor. We fall back to `auth.uid()` so the
-- existing user-driven path still works. The setting is per-session via
-- `set_config('app.actor_id', $1, true)` (`true` = local-only), so
-- there's no leak between requests.
--
-- Idempotent: CREATE OR REPLACE preserves the existing triggers (they
-- reference the function by name, not by signature).

CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor          UUID;
  v_actor_text     TEXT;
  v_resource_type  TEXT  := TG_ARGV[0];
  v_org_col        TEXT  := COALESCE(TG_ARGV[1], 'org_id');
  v_action         TEXT;
  v_old            JSONB := NULL;
  v_new            JSONB := NULL;
  v_resource_id    UUID;
  v_org_id         UUID  := NULL;
BEGIN
  -- Prefer an explicit actor passed in via `app.actor_id`; this lets
  -- service-role callers attribute audit rows correctly without bouncing
  -- through a JWT. Falls back to auth.uid() for user-direct calls.
  BEGIN
    v_actor_text := current_setting('app.actor_id', true);
    IF v_actor_text IS NOT NULL AND v_actor_text <> '' THEN
      v_actor := v_actor_text::UUID;
    ELSE
      v_actor := auth.uid();
    END IF;
  EXCEPTION
    WHEN invalid_text_representation OR others THEN
      v_actor := auth.uid();
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create_' || v_resource_type;
    v_new    := to_jsonb(NEW);
    v_resource_id := (v_new->>'id')::UUID;
    IF v_new ? v_org_col AND v_new->>v_org_col IS NOT NULL THEN
      v_org_id := (v_new->>v_org_col)::UUID;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_' || v_resource_type;
    v_old    := to_jsonb(OLD);
    v_new    := to_jsonb(NEW);
    v_resource_id := (v_new->>'id')::UUID;
    IF v_new ? v_org_col AND v_new->>v_org_col IS NOT NULL THEN
      v_org_id := (v_new->>v_org_col)::UUID;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_' || v_resource_type;
    v_old    := to_jsonb(OLD);
    v_resource_id := (v_old->>'id')::UUID;
    IF v_old ? v_org_col AND v_old->>v_org_col IS NOT NULL THEN
      v_org_id := (v_old->>v_org_col)::UUID;
    END IF;
  END IF;

  INSERT INTO "AuditLogs" (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    org_id,
    old_value,
    new_value,
    status
  ) VALUES (
    v_actor,
    v_action,
    v_resource_type,
    v_resource_id,
    v_org_id,
    v_old,
    v_new,
    'success'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- PostgREST-callable wrapper around set_config so service-role clients
-- (which can't issue arbitrary SQL) can stamp `app.actor_id` before a
-- mutation. The `is_local = true` flavour scopes the setting to the
-- current statement so it never leaks to the next pooled user of the
-- same connection.
CREATE OR REPLACE FUNCTION public.set_audit_actor(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.actor_id', p_user_id::TEXT, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_audit_actor(UUID)
  TO authenticated, service_role;
