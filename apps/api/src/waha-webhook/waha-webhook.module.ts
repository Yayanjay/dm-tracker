import { Module } from "@nestjs/common";
import { WahaWebhookController } from "./waha-webhook.controller";
import { WahaWebhookService } from "./waha-webhook.service";

@Module({
  controllers: [WahaWebhookController],
  providers: [WahaWebhookService],
})
export class WahaWebhookModule {}
