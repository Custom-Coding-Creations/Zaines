-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
