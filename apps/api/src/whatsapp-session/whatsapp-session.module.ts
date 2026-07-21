import { Module } from "@nestjs/common";
import { WhatsappSessionController } from "./whatsapp-session.controller";
import { WhatsappSessionService } from "./whatsapp-session.service";

@Module({
  controllers: [WhatsappSessionController],
  providers: [WhatsappSessionService],
})
export class WhatsappSessionModule {}
