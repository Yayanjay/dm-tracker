import { Controller, Post, Body, Res } from "@nestjs/common";
import { WahaWebhookService } from "./waha-webhook.service";
import { Response } from "express";

@Controller("webhooks/waha")
export class WahaWebhookController {
  constructor(private wahaWebhookService: WahaWebhookService) {}

  @Post()
  async receive(@Body() body: any, @Res() res: Response) {
    try {
      await this.wahaWebhookService.handleEvent(body);
    } catch {
      // always return 200 to WAHA regardless of internal errors
    }
    res.status(200).send();
  }
}
