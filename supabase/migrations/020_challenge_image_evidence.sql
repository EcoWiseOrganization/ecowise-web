-- Migration 020: Add image_url to Challenges, evidence_url and PendingReview status to UserChallenges
-- UserChallenges status enum update requires dropping and recreating if we use PostgreSQL ENUM,
-- but the current schema uses text check constraints for UserChallengeStatus.

ALTER TABLE "Challenges"
ADD COLUMN IF NOT EXISTS "image_url" text;

ALTER TABLE "UserChallenges"
ADD COLUMN IF NOT EXISTS "evidence_url" text;

-- Add "PendingReview" to check constraint of UserChallenges.status
ALTER TABLE "UserChallenges"
DROP CONSTRAINT IF EXISTS "UserChallenges_status_check";

ALTER TABLE "UserChallenges"
ADD CONSTRAINT "UserChallenges_status_check"
CHECK (status IN ('Joined', 'InProgress', 'PendingReview', 'Completed', 'Failed'));
