ALTER TABLE "consumption_logs" ALTER COLUMN "patient_id" DROP NOT NULL;
ALTER TABLE "consumption_logs" DROP CONSTRAINT IF EXISTS "consumption_logs_patient_id_fkey";
ALTER TABLE "consumption_logs" ADD CONSTRAINT "consumption_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;
