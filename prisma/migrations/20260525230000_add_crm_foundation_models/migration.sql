-- CreateTable
CREATE TABLE "crm_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'slate',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tag_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "sourceReference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_opportunities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "source" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "expectedCloseAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteriaJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "segmentId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_tags_name_key" ON "crm_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "crm_tag_assignments_userId_tagId_key" ON "crm_tag_assignments"("userId", "tagId");

-- CreateIndex
CREATE INDEX "crm_tag_assignments_userId_idx" ON "crm_tag_assignments"("userId");

-- CreateIndex
CREATE INDEX "crm_tag_assignments_tagId_idx" ON "crm_tag_assignments"("tagId");

-- CreateIndex
CREATE INDEX "crm_notes_userId_createdAt_idx" ON "crm_notes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "crm_notes_createdByUserId_idx" ON "crm_notes"("createdByUserId");

-- CreateIndex
CREATE INDEX "crm_tasks_userId_status_idx" ON "crm_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "crm_tasks_assignedToUserId_idx" ON "crm_tasks"("assignedToUserId");

-- CreateIndex
CREATE INDEX "crm_tasks_dueAt_idx" ON "crm_tasks"("dueAt");

-- CreateIndex
CREATE INDEX "crm_interactions_userId_occurredAt_idx" ON "crm_interactions"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "crm_interactions_channel_idx" ON "crm_interactions"("channel");

-- CreateIndex
CREATE INDEX "crm_interactions_sourceSystem_sourceReference_idx" ON "crm_interactions"("sourceSystem", "sourceReference");

-- CreateIndex
CREATE INDEX "crm_opportunities_userId_stage_idx" ON "crm_opportunities"("userId", "stage");

-- CreateIndex
CREATE INDEX "crm_opportunities_ownerUserId_idx" ON "crm_opportunities"("ownerUserId");

-- CreateIndex
CREATE INDEX "crm_opportunities_expectedCloseAt_idx" ON "crm_opportunities"("expectedCloseAt");

-- CreateIndex
CREATE INDEX "crm_segments_isActive_idx" ON "crm_segments"("isActive");

-- CreateIndex
CREATE INDEX "crm_segments_createdByUserId_idx" ON "crm_segments"("createdByUserId");

-- CreateIndex
CREATE INDEX "crm_campaigns_status_idx" ON "crm_campaigns"("status");

-- CreateIndex
CREATE INDEX "crm_campaigns_channel_idx" ON "crm_campaigns"("channel");

-- CreateIndex
CREATE INDEX "crm_campaigns_scheduledFor_idx" ON "crm_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "crm_campaigns_createdByUserId_idx" ON "crm_campaigns"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_campaign_recipients_campaignId_userId_key" ON "crm_campaign_recipients"("campaignId", "userId");

-- CreateIndex
CREATE INDEX "crm_campaign_recipients_userId_idx" ON "crm_campaign_recipients"("userId");

-- CreateIndex
CREATE INDEX "crm_campaign_recipients_status_idx" ON "crm_campaign_recipients"("status");

-- AddForeignKey
ALTER TABLE "crm_tag_assignments" ADD CONSTRAINT "crm_tag_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tag_assignments" ADD CONSTRAINT "crm_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "crm_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_segments" ADD CONSTRAINT "crm_segments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_recipients" ADD CONSTRAINT "crm_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "crm_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_campaign_recipients" ADD CONSTRAINT "crm_campaign_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
