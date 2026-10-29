-- ---------------------------------------------------------------------------
-- IntotheHimalayas — moderator role
-- Run this file on its own, before 0005. PostgreSQL cannot use a new enum value
-- in the same transaction that adds it.
-- ---------------------------------------------------------------------------

alter type public.user_role add value if not exists 'moderator';
