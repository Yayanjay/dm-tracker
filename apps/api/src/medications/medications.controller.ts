import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { MedicationsService } from "./medications.service";
import { CreateMedicationDto } from "./dto/create-medication.dto";
import { UpdateMedicationDto } from "./dto/update-medication.dto";
import { PaginationRequest } from "@dm-tracker/shared";

@Controller("medications")
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private medicationsService: MedicationsService) {}

  @Post("list")
  async list(@Body() dto: PaginationRequest) {
    return this.medicationsService.list(dto);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.medicationsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateMedicationDto, @Req() req: any) {
    return this.medicationsService.create(dto, req.admin.id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateMedicationDto) {
    return this.medicationsService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.medicationsService.delete(id);
    return { data: { message: "Obat dihapus" } };
  }
}
