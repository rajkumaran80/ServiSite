-- Backfill normalizedEmail for existing users who have NULL.
-- Logic mirrors email.util.ts normalizeEmail():
--   1. lowercase (already stored lowercase)
--   2. strip +alias for all providers
--   3. remove dots for gmail.com / googlemail.com
--   4. unify googlemail.com -> gmail.com

UPDATE users
SET "normalizedEmail" = (
  CASE
    -- Gmail / Googlemail: remove dots and strip +alias, unify domain
    WHEN split_part(email, '@', 2) IN ('gmail.com', 'googlemail.com') THEN
      regexp_replace(split_part(email, '+', 1), '\.', '', 'g')
      || '@gmail.com'
    -- All other providers: strip +alias only
    ELSE
      split_part(email, '+', 1) || '@' || split_part(email, '@', 2)
  END
)
WHERE "normalizedEmail" IS NULL;
