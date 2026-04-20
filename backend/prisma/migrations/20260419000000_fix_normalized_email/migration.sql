-- Fix normalizedEmail for all users (corrects the buggy backfill from 20260418).
-- Correctly operates on the local part only before reconstructing the address.
--
-- Algorithm (mirrors email.util.ts normalizeEmail):
--   local  = everything before @
--   domain = everything after @
--   1. Strip +alias: take only the part before the first '+'
--   2. For gmail / googlemail: remove all dots from local, use gmail.com as domain
--   3. Others: keep local (minus +alias) + original domain

UPDATE users
SET "normalizedEmail" = (
  CASE
    WHEN split_part(email, '@', 2) IN ('gmail.com', 'googlemail.com') THEN
      regexp_replace(
        split_part(split_part(email, '@', 1), '+', 1),
        '\.',
        '',
        'g'
      ) || '@gmail.com'
    ELSE
      split_part(split_part(email, '@', 1), '+', 1)
      || '@'
      || split_part(email, '@', 2)
  END
);
