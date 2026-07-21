import { Module } from "@nestjs/common";
import { WahaWebhookController } from "./waha-webhook.controller";
import { WahaWebhookService } from "./waha-webhook.service";
import { WhatsappSessionModule } from "../whatsapp-session/whatsapp-session.module";

@Module({
  imports: [WhatsappSessionModule],
  controllers: [WahaWebhookController],
  providers: [WahaWebhookService],
})
export class WahaWebhookModule {}
