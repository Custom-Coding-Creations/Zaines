-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "hireDate" TIMESTAMP(3),
    "certifications" TEXT[],
    "emergencyContact" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shiftStart" TEXT NOT NULL,
    "shiftEnd" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_cards" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "overallMood" TEXT NOT NULL,
    "energyLevel" INTEGER NOT NULL,
    "appetiteLevel" TEXT NOT NULL,
    "socialization" TEXT NOT NULL,
    "bathroomNotes" TEXT,
    "playHighlights" TEXT,
    "behaviorNotes" TEXT,
    "staffNotes" TEXT,
    "sentToOwner" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_reports" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "petId" TEXT NOT NULL,
    "reportedByStaffId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "vetReferral" BOOLEAN NOT NULL DEFAULT false,
    "vetDetails" TEXT,
    "ownerNotified" BOOLEAN NOT NULL DEFAULT false,
    "ownerNotifiedAt" TIMESTAMP(3),
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "followUpCompletedAt" TIMESTAMP(3),
    "photos" TEXT[],
    "witnessNames" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "validDays" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "suiteId" TEXT,
    "serviceType" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavioral_assessments" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "assessedByStaffId" TEXT,
    "assessmentDate" TIMESTAMP(3) NOT NULL,
    "reactivityLevel" INTEGER NOT NULL,
    "resourceGuarding" BOOLEAN NOT NULL DEFAULT false,
    "leashBehavior" TEXT NOT NULL,
    "separationAnxiety" TEXT NOT NULL,
    "playStyle" TEXT NOT NULL,
    "sizeCompatibility" TEXT NOT NULL,
    "energyLevel" TEXT NOT NULL,
    "overallResult" TEXT NOT NULL,
    "conditions" TEXT,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "sizeCategory" TEXT NOT NULL,
    "energyLevel" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "play_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_group_assignments" (
    "id" TEXT NOT NULL,
    "playGroupId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "bookingId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "behaviorNotes" TEXT,

    CONSTRAINT "play_group_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_surcharges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "surchargeType" TEXT NOT NULL,
    "surchargeAmount" DOUBLE PRECISION NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_surcharges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automated_reminders" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "bookingId" TEXT,
    "petId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automated_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slot_configs" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "serviceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slot_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL,
    "reorderLevel" DOUBLE PRECISION NOT NULL,
    "reorderQuantity" DOUBLE PRECISION NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "supplier" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add missing columns to bookings
ALTER TABLE "bookings" ADD COLUMN "packageId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "recurringBookingId" TEXT;
ALTER TABLE "bookings" ADD COLUMN "dropoffTimeSlot" TEXT;
ALTER TABLE "bookings" ADD COLUMN "pickupTimeSlot" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_userId_key" ON "staff_members"("userId");

-- CreateIndex
CREATE INDEX "staff_members_role_idx" ON "staff_members"("role");

-- CreateIndex
CREATE INDEX "staff_members_isActive_idx" ON "staff_members"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "staff_schedules_staffMemberId_date_shiftStart_shiftEnd_key" ON "staff_schedules"("staffMemberId", "date", "shiftStart", "shiftEnd");

-- CreateIndex
CREATE INDEX "staff_schedules_date_idx" ON "staff_schedules"("date");

-- CreateIndex
CREATE INDEX "report_cards_bookingId_idx" ON "report_cards"("bookingId");

-- CreateIndex
CREATE INDEX "report_cards_petId_idx" ON "report_cards"("petId");

-- CreateIndex
CREATE INDEX "report_cards_date_idx" ON "report_cards"("date");

-- CreateIndex
CREATE INDEX "report_cards_sentToOwner_idx" ON "report_cards"("sentToOwner");

-- CreateIndex
CREATE INDEX "incident_reports_bookingId_idx" ON "incident_reports"("bookingId");

-- CreateIndex
CREATE INDEX "incident_reports_petId_idx" ON "incident_reports"("petId");

-- CreateIndex
CREATE INDEX "incident_reports_type_idx" ON "incident_reports"("type");

-- CreateIndex
CREATE INDEX "incident_reports_severity_idx" ON "incident_reports"("severity");

-- CreateIndex
CREATE INDEX "incident_reports_followUpRequired_idx" ON "incident_reports"("followUpRequired");

-- CreateIndex
CREATE INDEX "booking_packages_type_idx" ON "booking_packages"("type");

-- CreateIndex
CREATE INDEX "booking_packages_isActive_idx" ON "booking_packages"("isActive");

-- CreateIndex
CREATE INDEX "customer_packages_userId_idx" ON "customer_packages"("userId");

-- CreateIndex
CREATE INDEX "customer_packages_packageId_idx" ON "customer_packages"("packageId");

-- CreateIndex
CREATE INDEX "customer_packages_status_idx" ON "customer_packages"("status");

-- CreateIndex
CREATE INDEX "customer_packages_expiresAt_idx" ON "customer_packages"("expiresAt");

-- CreateIndex
CREATE INDEX "recurring_bookings_userId_idx" ON "recurring_bookings"("userId");

-- CreateIndex
CREATE INDEX "recurring_bookings_suiteId_idx" ON "recurring_bookings"("suiteId");

-- CreateIndex
CREATE INDEX "recurring_bookings_isActive_idx" ON "recurring_bookings"("isActive");

-- CreateIndex
CREATE INDEX "behavioral_assessments_petId_idx" ON "behavioral_assessments"("petId");

-- CreateIndex
CREATE INDEX "behavioral_assessments_assessmentDate_idx" ON "behavioral_assessments"("assessmentDate");

-- CreateIndex
CREATE INDEX "behavioral_assessments_overallResult_idx" ON "behavioral_assessments"("overallResult");

-- CreateIndex
CREATE INDEX "behavioral_assessments_validUntil_idx" ON "behavioral_assessments"("validUntil");

-- CreateIndex
CREATE INDEX "play_groups_date_idx" ON "play_groups"("date");

-- CreateIndex
CREATE INDEX "play_groups_location_idx" ON "play_groups"("location");

-- CreateIndex
CREATE INDEX "play_groups_staffMemberId_idx" ON "play_groups"("staffMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "play_group_assignments_playGroupId_petId_key" ON "play_group_assignments"("playGroupId", "petId");

-- CreateIndex
CREATE INDEX "play_group_assignments_petId_idx" ON "play_group_assignments"("petId");

-- CreateIndex
CREATE INDEX "play_group_assignments_bookingId_idx" ON "play_group_assignments"("bookingId");

-- CreateIndex
CREATE INDEX "holiday_surcharges_startDate_idx" ON "holiday_surcharges"("startDate");

-- CreateIndex
CREATE INDEX "holiday_surcharges_endDate_idx" ON "holiday_surcharges"("endDate");

-- CreateIndex
CREATE INDEX "holiday_surcharges_isActive_idx" ON "holiday_surcharges"("isActive");

-- CreateIndex
CREATE INDEX "automated_reminders_recipientUserId_idx" ON "automated_reminders"("recipientUserId");

-- CreateIndex
CREATE INDEX "automated_reminders_bookingId_idx" ON "automated_reminders"("bookingId");

-- CreateIndex
CREATE INDEX "automated_reminders_petId_idx" ON "automated_reminders"("petId");

-- CreateIndex
CREATE INDEX "automated_reminders_scheduledFor_idx" ON "automated_reminders"("scheduledFor");

-- CreateIndex
CREATE INDEX "automated_reminders_sent_idx" ON "automated_reminders"("sent");

-- CreateIndex
CREATE INDEX "time_slot_configs_dayOfWeek_idx" ON "time_slot_configs"("dayOfWeek");

-- CreateIndex
CREATE INDEX "time_slot_configs_serviceType_idx" ON "time_slot_configs"("serviceType");

-- CreateIndex
CREATE INDEX "time_slot_configs_isActive_idx" ON "time_slot_configs"("isActive");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "inventory_items_isActive_idx" ON "inventory_items"("isActive");

-- CreateIndex
CREATE INDEX "inventory_logs_itemId_idx" ON "inventory_logs"("itemId");

-- CreateIndex
CREATE INDEX "inventory_logs_changeType_idx" ON "inventory_logs"("changeType");

-- CreateIndex
CREATE INDEX "inventory_logs_createdAt_idx" ON "inventory_logs"("createdAt");

-- CreateIndex (bookings new columns)
CREATE INDEX "bookings_packageId_idx" ON "bookings"("packageId");

-- CreateIndex
CREATE INDEX "bookings_recurringBookingId_idx" ON "bookings"("recurringBookingId");

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reportedByStaffId_fkey" FOREIGN KEY ("reportedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "booking_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_bookings" ADD CONSTRAINT "recurring_bookings_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "suites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_assessments" ADD CONSTRAINT "behavioral_assessments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_assessments" ADD CONSTRAINT "behavioral_assessments_assessedByStaffId_fkey" FOREIGN KEY ("assessedByStaffId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_groups" ADD CONSTRAINT "play_groups_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_group_assignments" ADD CONSTRAINT "play_group_assignments_playGroupId_fkey" FOREIGN KEY ("playGroupId") REFERENCES "play_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_group_assignments" ADD CONSTRAINT "play_group_assignments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_group_assignments" ADD CONSTRAINT "play_group_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_reminders" ADD CONSTRAINT "automated_reminders_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_reminders" ADD CONSTRAINT "automated_reminders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_reminders" ADD CONSTRAINT "automated_reminders_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "booking_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_recurringBookingId_fkey" FOREIGN KEY ("recurringBookingId") REFERENCES "recurring_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
