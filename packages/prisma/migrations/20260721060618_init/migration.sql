-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('pending', 'opted_in', 'opted_out');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('pending', 'sent', 'confirmed', 'missed', 'failed');

-- CreateEnum
CREATE TYPE "ConsumptionStatus" AS ENUM ('taken', 'skipped', 'missed');

-- CreateEnum
CREATE TYPE "ConsumptionSource" AS ENUM ('button', 'free_text', 'system_missed');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('enrollment', 'reminder', 'optin_confirm', 'usage_hint', 'already_opted_in');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('superadmin');

-- CreateEnum
CREATE TYPE "OutboundKind" AS ENUM ('opt_in', 'reminder', 'usage_hint', 'opt_in_confirm');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'superadmin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wa_number" TEXT NOT NULL,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "consent_status" "ConsentStatus" NOT NULL DEFAULT 'pending',
    "consent_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "schedule_times" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "waha_message_id" TEXT,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption_logs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "reminder_id" TEXT,
    "status" "ConsumptionStatus" NOT NULL,
    "source" "ConsumptionSource" NOT NULL,
    "raw_text" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumption_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_messages" (
    "id" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "button_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "kind" "OutboundKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "waha_message_id" TEXT,
    "status" "OutboundStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_wa_number_key" ON "patients"("wa_number");

-- CreateIndex
CREATE INDEX "patients_consent_status_idx" ON "patients"("consent_status");

-- CreateIndex
CREATE INDEX "patients_active_idx" ON "patients"("active");

-- CreateIndex
CREATE INDEX "medications_patient_id_idx" ON "medications"("patient_id");

-- CreateIndex
CREATE INDEX "reminders_patient_id_scheduled_at_status_idx" ON "reminders"("patient_id", "scheduled_at", "status");

-- CreateIndex
CREATE INDEX "reminders_medication_id_scheduled_at_idx" ON "reminders"("medication_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "reminders_status_idx" ON "reminders"("status");

-- CreateIndex
CREATE INDEX "consumption_logs_patient_id_idx" ON "consumption_logs"("patient_id");

-- CreateIndex
CREATE INDEX "consumption_logs_medication_id_idx" ON "consumption_logs"("medication_id");

-- CreateIndex
CREATE INDEX "consumption_logs_reminder_id_idx" ON "consumption_logs"("reminder_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_messages_key_key" ON "template_messages"("key");

-- CreateIndex
CREATE INDEX "outbound_messages_patient_id_idx" ON "outbound_messages"("patient_id");

-- CreateIndex
CREATE INDEX "outbound_messages_status_idx" ON "outbound_messages"("status");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
