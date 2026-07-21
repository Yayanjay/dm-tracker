import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WahaClientService } from "../waha-client/waha-client.service";
import { renderTemplate } from "@dm-tracker/shared";

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private waha: WahaClientService,
  ) {}

  async seedReminders() {
    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const patients = await this.prisma.patient.findMany({
      where: {
        consentStatus: "opted_in",
        active: true,
      },
      include: {
        medications: {
          where: { active: true },
        },
      },
    });

    for (const patient of patients) {
      for (const medication of patient.medications) {
        for (const timeStr of medication.scheduleTimes) {
          const [hour, minute] = timeStr.split(":").map(Number);
          let scheduled = this.buildWibDate(hour, minute);
          const utc = this.wibToUtc(scheduled);

          while (utc <= oneDayLater) {
            const exists = await this.prisma.reminder.findFirst({
              where: {
                medicationId: medication.id,
                scheduledAt: utc,
              },
            });

            if (!exists) {
              await this.prisma.reminder.create({
                data: {
                  patientId: patient.id,
                  medicationId: medication.id,
                  scheduledAt: utc,
                  status: "pending",
                },
              });
            }

            scheduled = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
          }
        }
      }
    }
  }

  async dispatchReminders() {
    const now = new Date();

    const pending = await this.prisma.reminder.findMany({
      where: {
        status: "pending",
        scheduledAt: { lte: now },
      },
      include: {
        patient: true,
        medication: true,
      },
      take: 50,
    });

    for (const reminder of pending) {
      const template = await this.prisma.templateMessage.findUnique({
        where: { key: "reminder" },
      });

      if (!template) continue;

      const chatId = `${reminder.patient.waNumber}@c.us`;
      const body = renderTemplate(template.body, {
        name: reminder.patient.name,
        medication_name: reminder.medication.name,
        dosage: reminder.medication.dosage,
        unit: reminder.medication.unit,
      });

      const footer = 'Balas "sudah" jika sudah minum, "belum" jika belum';

      try {
        const wahaMessageId = await this.waha.sendButtons(
          chatId,
          template.title,
          body,
          footer,
          [
            { type: "reply", text: template.buttonLabels[0] || "Sudah minum" },
            { type: "reply", text: template.buttonLabels[1] || "Belum" },
          ],
        );

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            wahaMessageId,
          },
        });

        await this.prisma.outboundMessage.create({
          data: {
            patientId: reminder.patientId,
            kind: "reminder",
            payload: { chatId, body, buttons: template.buttonLabels },
            wahaMessageId,
            status: "sent",
          },
        });
      } catch (error: any) {
        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "failed" },
        });

        await this.prisma.outboundMessage.create({
          data: {
            patientId: reminder.patientId,
            kind: "reminder",
            payload: { chatId },
            status: "failed",
            error: error.message,
          },
        });
      }
    }
  }

  async markMissed() {
    const now = new Date();

    const sentReminders = await this.prisma.reminder.findMany({
      where: { status: "sent" },
      include: { medication: true },
    });

    for (const reminder of sentReminders) {
      const hasConsumption = await this.prisma.consumptionLog.findFirst({
        where: { reminderId: reminder.id },
      });

      if (hasConsumption) continue;

      const nextReminder = await this.prisma.reminder.findFirst({
        where: {
          medicationId: reminder.medicationId,
          scheduledAt: { gt: reminder.scheduledAt },
        },
        orderBy: { scheduledAt: "asc" },
      });

      if (!nextReminder || nextReminder.scheduledAt > now) continue;

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "missed" },
      });

      await this.prisma.consumptionLog.create({
        data: {
          patientId: reminder.patientId,
          medicationId: reminder.medicationId,
          reminderId: reminder.id,
          status: "missed",
          source: "system_missed",
        },
      });
    }
  }

  private buildWibDate(hour: number, minute: number): Date {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  private wibToUtc(date: Date): Date {
    return new Date(date.getTime() - 7 * 60 * 60 * 1000);
  }
}
