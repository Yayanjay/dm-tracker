import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WahaClientService } from "../waha-client/waha-client.service";
import { WhatsappSessionService } from "../whatsapp-session/whatsapp-session.service";
import { renderTemplate } from "@dm-tracker/shared";

const TAKEN_REGEX = /sudah|selesai|udah|minum/i;
const SKIPPED_REGEX = /belum|lewati|skip/i;

@Injectable()
export class WahaWebhookService {
  private readonly logger = new Logger(WahaWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private waha: WahaClientService,
    private whatsappSession: WhatsappSessionService,
  ) {}

  async handleEvent(body: any) {
    const event = body?.event;

    if (event === "session.status") {
      const status = body?.payload?.status ?? "UNKNOWN";
      const number = body?.payload?.me?.id?.replace("@c.us", "") ?? undefined;
      this.whatsappSession.setSessionStatus(status, number);
      this.logger.log(`Session status: ${status}`);
      return;
    }

    if (event === "message") {
      await this.handleMessage(body.payload);
      return;
    }

    this.logger.warn(`Unknown webhook event: ${event}`);
  }

  private async handleMessage(payload: any) {
    if (!payload?.from) return;

    const waNumber = payload.from.replace("@c.us", "");
    const patient = await this.prisma.patient.findUnique({
      where: { waNumber, active: true },
    });

    if (!patient) return;

    if (patient.consentStatus !== "opted_in") {
      await this.handleConsent(patient.id, waNumber, payload);
      return;
    }

    const buttonText = payload?.button?.text || payload?.buttonText || "";
    const body = payload?.body || "";
    const input = (buttonText + " " + body).toLowerCase().trim();

    const isTaken = TAKEN_REGEX.test(input);
    const isSkipped = SKIPPED_REGEX.test(input);

    if (!isTaken && !isSkipped) {
      const template = await this.prisma.templateMessage.findUnique({
        where: { key: "usage_hint" },
      });

      if (template) {
        await this.waha.sendText(
          `${waNumber}@c.us`,
          `${template.title}\n\n${template.body}`,
        );
      }
      return;
    }

    const status = isTaken ? "taken" : "skipped";
    const source = buttonText ? "button" : "free_text";

    const recentReminder = await this.prisma.reminder.findFirst({
      where: {
        patientId: patient.id,
        status: "sent",
      },
      orderBy: { scheduledAt: "desc" },
    });

    if (recentReminder) {
      await this.prisma.reminder.update({
        where: { id: recentReminder.id },
        data: { status: "confirmed" },
      });

      await this.prisma.consumptionLog.create({
        data: {
          patientId: patient.id,
          medicationId: recentReminder.medicationId,
          reminderId: recentReminder.id,
          status,
          source,
          rawText: buttonText || body || null,
        },
      });
    } else {
      const medication = await this.prisma.medication.findFirst({
        where: { patientId: patient.id, active: true },
        orderBy: { createdAt: "desc" },
      });

      if (medication) {
        await this.prisma.consumptionLog.create({
          data: {
            patientId: patient.id,
            medicationId: medication.id,
            status,
            source,
            rawText: buttonText || body || null,
          },
        });
      }
    }

    await this.waha.sendText(`${waNumber}@c.us`, `Tercatat. Terima kasih.`);
  }

  private async handleConsent(
    patientId: string,
    waNumber: string,
    payload: any,
  ) {
    const buttonText = payload?.button?.text || payload?.buttonText || "";
    const body = payload?.body || "";
    const input = (buttonText + " " + body).toLowerCase().trim();

    const isAgreed = /setuju/i.test(input) || /ya/i.test(input);
    const isDeclined = /nanti/i.test(input) || /tidak/i.test(input) || /batal/i.test(input);

    const chatId = `${waNumber}@c.us`;

    if (isAgreed) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          consentStatus: "opted_in",
          consentAt: new Date(),
        },
      });

      const template = await this.prisma.templateMessage.findUnique({
        where: { key: "optin_confirm" },
      });

      if (template) {
        const patient = await this.prisma.patient.findUnique({
          where: { id: patientId },
        });
        const msg = renderTemplate(template.body, { name: patient?.name || "" });
        await this.waha.sendText(chatId, `${template.title}\n\n${msg}`);
      }

      return;
    }

    if (isDeclined) {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          consentStatus: "opted_out",
          consentAt: new Date(),
        },
      });

      const template = await this.prisma.templateMessage.findUnique({
        where: { key: "usage_hint" },
      });

      if (template) {
        await this.waha.sendText(chatId, `${template.title}\n\n${template.body}`);
      }

      return;
    }

    const template = await this.prisma.templateMessage.findUnique({
      where: { key: "enrollment" },
    });

    if (template) {
      await this.waha.sendButtons(chatId, template.title, template.body, "", [
        { type: "reply", text: template.buttonLabels[0] || "Setuju" },
        { type: "reply", text: template.buttonLabels[1] || "Nanti saja" },
      ]);
    }
  }
}
