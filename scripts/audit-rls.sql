-- ================================================================
-- EcoWise: RLS audit (Phase 11)
--
-- Run inside Supabase SQL editor or via psql to print every policy on
-- application tables. Cross-check the output against the role matrix in
-- docs/plan.md §1 to confirm no privilege creep.
-- ================================================================

-- 1) Tables we care about (skip postgres internals + supabase auth schema).
WITH app_tables AS (
  SELECT c.oid, n.nspname AS schema, c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname = 'public'
    AND c.relname IN (
      'User',
      'Organization',
      'OrganizationMembers',
      'Events',
      'EmissionLogs',
      'EmissionFactors',
      'EmissionCategories',
      'CalculationTemplates',
      'AuditLogs',
      'ContactMessages',
      'ContactRateLimits',
      'CarbonTargets',
      'DailyLogCounters',
      'EventPublicForms',
      'EventPublicSubmissions',
      'EventPublicFormRateLimits',
      'ReportArchives',
      'SubscriptionPlans',
      'Subscriptions',
      'Invoices',
      'PaymentMethods',
      'PaymentIntents',
      'Challenges',
      'UserChallenges',
      'Badges',
      'UserBadges',
      'Rewards',
      'Redemptions',
      'GreenPointLogs'
    )
)
SELECT
  t.table_name,
  t.relrowsecurity        AS rls_enabled,
  COALESCE(p.policy_count, 0) AS policy_count,
  COALESCE(p.has_select, false)   AS has_select_policy,
  COALESCE(p.has_insert, false)   AS has_insert_policy,
  COALESCE(p.has_update, false)   AS has_update_policy,
  COALESCE(p.has_delete, false)   AS has_delete_policy
FROM (
  SELECT a.table_name, c.relrowsecurity
  FROM app_tables a
  JOIN pg_class c ON c.oid = a.oid
) t
LEFT JOIN (
  SELECT
    pol.tablename AS table_name,
    COUNT(*)                                AS policy_count,
    BOOL_OR(pol.cmd = 'SELECT' OR pol.cmd = 'ALL') AS has_select,
    BOOL_OR(pol.cmd = 'INSERT' OR pol.cmd = 'ALL') AS has_insert,
    BOOL_OR(pol.cmd = 'UPDATE' OR pol.cmd = 'ALL') AS has_update,
    BOOL_OR(pol.cmd = 'DELETE' OR pol.cmd = 'ALL') AS has_delete
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
  GROUP BY pol.tablename
) p ON p.table_name = t.table_name
ORDER BY t.table_name;

-- 2) Detailed per-policy listing
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
