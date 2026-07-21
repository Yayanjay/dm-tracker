import { Controller, Post, Get, UseGuards, Res } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { WhatsappSessionService } from "./whatsapp-session.service";
import { Response } from "express";

@Controller("whatsapp/session")
@UseGuards(JwtAuthGuard)
export class WhatsappSessionController {
  constructor(private whatsappSession: WhatsappSessionService) {}

  @Post("start")
  async start() {
    await this.whatsappSession.start();
    return { message: "Session started" };
  }

  @Post("stop")
  async stop() {
    await this.whatsappSession.stop();
    return { message: "Session stopped" };
  }

  @Get("status")
  async status() {
    const result = await this.whatsappSession.getStatus();
    return { data: result };
  }

  @Get("qr")
  async qr(@Res() res: Response) {
    const qrBuffer = await this.whatsappSession.getQr();
    if (!qrBuffer) {
      return res.status(404).json({
        code: 404,
        message: "QR code belum tersedia. Silakan mulai session terlebih dahulu.",
        data: null,
      });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.send(qrBuffer);
  }
}
