import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PatientsService } from "./patients.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PaginationRequest } from "@kawalgula/shared";

@Controller("patients")
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post("list")
  async list(@Body() dto: PaginationRequest) {
    return this.patientsService.list(dto);
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.patientsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreatePatientDto, @Req() req: any) {
    return this.patientsService.create(dto, req.admin.id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Post(":id/resend-optin")
  async resendOptin(@Param("id") id: string) {
    return this.patientsService.resendOptin(id);
  }
}
