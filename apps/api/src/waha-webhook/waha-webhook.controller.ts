import { Controller, Post, Body, Res, Logger } from "@nestjs/common";
import { WahaWebhookService } from "./waha-webhook.service";
import { Response } from "express";

@Controller("webhooks/waha")
export class WahaWebhookController {
  private readonly logger = new Logger(WahaWebhookController.name);

  constructor(private wahaWebhookService: WahaWebhookService) {}

  @Post()
  async receive(@Body() body: any, @Res() res: Response) {
    try {
      await this.wahaWebhookService.handleEvent(body);
    } catch (error: any) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
    }
    res.status(200).send();
  }
}
