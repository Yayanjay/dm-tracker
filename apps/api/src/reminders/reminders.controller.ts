import { Controller, Post, Body, UseGuards, ForbiddenException } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RemindersService } from "./reminders.service";
import { ConfigService } from "@nestjs/config";

@Controller("reminders")
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(
    private remindersService: RemindersService,
    private config: ConfigService,
  ) {}

  @Post("send-now")
  async sendNow(@Body("patientMedicationId") patientMedicationId?: string) {
    if (this.config.get<string>("ENABLE_MANUAL_REMINDER") !== "true") {
      throw new ForbiddenException("Manual reminder is disabled");
    }
    await this.remindersService.dispatchReminders(patientMedicationId);
    return { data: { message: "Pengingat dikirim" } };
  }
}
