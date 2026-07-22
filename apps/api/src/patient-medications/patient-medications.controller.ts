import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PatientMedicationsService } from "./patient-medications.service";
import { CreatePatientMedicationDto } from "./dto/create-patient-medication.dto";
import { UpdatePatientMedicationDto } from "./dto/update-patient-medication.dto";
import { PaginationRequest } from "@dm-tracker/shared";

@Controller("patient-medications")
@UseGuards(JwtAuthGuard)
export class PatientMedicationsController {
  constructor(private service: PatientMedicationsService) {}

  @Post("list")
  async list(@Body() dto: PaginationRequest & { patientId?: string }) {
    return this.service.list(dto);
  }

  @Post()
  async assign(@Body() dto: CreatePatientMedicationDto, @Req() req: any) {
    return this.service.assign(dto, req.admin.id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdatePatientMedicationDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.service.delete(id);
    return { data: { message: "Obat dilepas dari pasien" } };
  }
}
