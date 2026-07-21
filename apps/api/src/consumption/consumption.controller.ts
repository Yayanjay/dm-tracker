import { Controller, Post, Body, UseGuards, Res } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ConsumptionService } from "./consumption.service";
import { PaginationRequest } from "@dm-tracker/shared";
import { Response } from "express";

@Controller("consumption")
@UseGuards(JwtAuthGuard)
export class ConsumptionController {
  constructor(private consumptionService: ConsumptionService) {}

  @Post("list")
  async list(@Body() dto: PaginationRequest & { patientId?: string }) {
    return this.consumptionService.list(dto);
  }

  @Post("export")
  async export(
    @Body() dto: PaginationRequest & { patientId?: string },
    @Res() res: Response,
  ) {
    const csv = await this.consumptionService.exportCsv(dto);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=consumption-export.csv",
    );
    res.send("\uFEFF" + csv);
  }
}
