-- Migration: refactor Medication into master + junction
-- Step 1: Create patient_medications from existing medications data
CREATE TABLE "patient_medications" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "schedule_times" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id")
);

-- Migrate existing medications: each row becomes master + junction
INSERT INTO "patient_medications" ("id", "patient_id", "medication_id", "schedule_times", "active", "created_at", "created_by_id")
SELECT "id", "patient_id", "id", "schedule_times", "active", COALESCE("created_at", NOW()), COALESCE("created_by_id", 'SYSTEM')
FROM "medications";

-- Step 2: Rename medication_id → patient_medication_id in reminders
ALTER TABLE "reminders" DROP CONSTRAINT IF EXISTS "reminders_medication_id_fkey";
ALTER TABLE "reminders" ADD COLUMN "patient_medication_id" TEXT;
UPDATE "reminders" SET "patient_medication_id" = "medication_id";
ALTER TABLE "reminders" DROP COLUMN "medication_id";
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patient_medication_id_fkey" FOREIGN KEY ("patient_medication_id") REFERENCES "patient_medications"("id") ON DELETE CASCADE;

-- Step 3: Rename medication_id → patient_medication_id in consumption_logs (nullable)
ALTER TABLE "consumption_logs" DROP CONSTRAINT IF EXISTS "consumption_logs_medication_id_fkey";
ALTER TABLE "consumption_logs" ADD COLUMN "patient_medication_id" TEXT;
UPDATE "consumption_logs" SET "patient_medication_id" = "medication_id";
ALTER TABLE "consumption_logs" DROP COLUMN "medication_id";
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_patient_medication_id_fkey" FOREIGN KEY ("patient_medication_id") REFERENCES "patient_medications"("id") ON DELETE SET NULL;

-- Step 4: Add FK from patient_medications to medications (self-ref for the master id)
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE CASCADE;
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;

-- Step 5: Remove old columns from medications (they're now in patient_medications)
ALTER TABLE "medications" DROP COLUMN IF EXISTS "patient_id";
ALTER TABLE "medications" DROP COLUMN IF EXISTS "schedule_times";
ALTER TABLE "medications" DROP COLUMN IF EXISTS "active";

-- Step 6: Add indexes
CREATE INDEX IF NOT EXISTS "patient_medications_patient_id_idx" ON "patient_medications"("patient_id");
CREATE INDEX IF NOT EXISTS "patient_medications_medication_id_idx" ON "patient_medications"("medication_id");
CREATE INDEX IF NOT EXISTS "reminders_patient_medication_id_idx" ON "reminders"("patient_medication_id");
CREATE INDEX IF NOT EXISTS "consumption_logs_patient_medication_id_idx" ON "consumption_logs"("patient_medication_id");
