-- Create table for CRM campaign recipient delivery attempt history
CREATE TABLE "crm_campaign_recipient_attempts" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorDetail" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crm_campaign_recipient_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_campaign_recipient_attempts_recipientId_attemptedAt_idx"
  ON "crm_campaign_recipient_attempts"("recipientId", "attemptedAt");

CREATE INDEX "crm_campaign_recipient_attempts_campaignId_attemptedAt_idx"
  ON "crm_campaign_recipient_attempts"("campaignId", "attemptedAt");

CREATE INDEX "crm_campaign_recipient_attempts_status_idx"
  ON "crm_campaign_recipient_attempts"("status");

ALTER TABLE "crm_campaign_recipient_attempts"
  ADD CONSTRAINT "crm_campaign_recipient_attempts_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "crm_campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_campaign_recipient_attempts"
  ADD CONSTRAINT "crm_campaign_recipient_attempts_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_campaign_recipient_attempts"
  ADD CONSTRAINT "crm_campaign_recipient_attempts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
