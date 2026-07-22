import { Module } from "@nestjs/common";
import { PatientMedicationsController } from "./patient-medications.controller";
import { PatientMedicationsService } from "./patient-medications.service";

@Module({
  controllers: [PatientMedicationsController],
  providers: [PatientMedicationsService],
})
export class PatientMedicationsModule {}
