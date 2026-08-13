-- ============================================================
-- Fix NULL token columns in auth.users that cause GoTrue HTTP 500
-- errors ("Database error querying schema" / "Database error
-- finding users").
--
-- GoTrue expects these string columns to be '' (empty string),
-- NEVER NULL:
--   confirmation_token, recovery_token, email_change_token_new,
--   email_change, email_change_token_current,
--   phone_change, phone_change_token, reauthentication_token
--
-- The `phone` column has a UNIQUE constraint, so it MUST be NULL
-- (not '') when the user has no phone number.
-- ============================================================

-- 1. Sanitize existing NULL token/change string columns → ''
UPDATE auth.users
SET
  confirmation_token        = COALESCE(confirmation_token, ''),
  recovery_token            = COALESCE(recovery_token, ''),
  email_change_token_new    = COALESCE(email_change_token_new, ''),
  email_change              = COALESCE(email_change, ''),
  email_change_token_current= COALESCE(email_change_token_current, ''),
  phone_change              = COALESCE(phone_change, ''),
  phone_change_token        = COALESCE(phone_change_token, ''),
  reauthentication_token    = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;

-- 2. Fix phone column: set to NULL where it is empty string
--    (prevents UNIQUE constraint duplicate key violations)
UPDATE auth.users
SET phone = NULL
WHERE phone = '';
