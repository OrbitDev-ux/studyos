-- User explicit UI language choice (null = AUTO auto-detection). Validated to a
-- supported locale server-side (features/i18n). No IP is ever stored.
ALTER TABLE "User" ADD COLUMN "locale" TEXT;
