import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WahaClientService } from "../waha-client/waha-client.service";
import { renderTemplate } from "@dm-tracker/shared";
import { DateTime } from "luxon";

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private waha: WahaClientService,
  ) {}

  async seedReminders() {
    const oneDayLater = DateTime.utc().plus({ days: 1 }).toJSDate();

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

          for (
            let scheduled = this.buildNextWibUtc(hour, minute);
            scheduled <= oneDayLater;
            scheduled = DateTime.fromJSDate(scheduled).plus({ days: 1 }).toJSDate()
          ) {
            const exists = await this.prisma.reminder.findFirst({
              where: {
                medicationId: medication.id,
                scheduledAt: scheduled,
              },
            });

            if (!exists) {
              await this.prisma.reminder.create({
                data: {
                  patientId: patient.id,
                  medicationId: medication.id,
                  scheduledAt: scheduled,
                  status: "pending",
                  createdById: "SYSTEM",
                },
              });
            }
          }
        }
      }
    }
  }

  async dispatchReminders(medicationId?: string) {
    const now = new Date();

    const where: any = { status: "pending" };
    if (medicationId) {
      where.medicationId = medicationId;
    } else {
      where.scheduledAt = { lte: now };
    }

    const pending = await this.prisma.reminder.findMany({
      where,
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

      const text = `${template.title}\n\n${body}\n\nBalas "sudah" jika sudah minum, "belum" jika belum.`;

      try {
        const wahaMessageId = await this.waha.sendText(chatId, text);

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
            createdById: "SYSTEM",
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
            createdById: "SYSTEM",
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
          createdById: "SYSTEM",
        },
      });
    }
  }

  private buildNextWibUtc(hour: number, minute: number): Date {
    const nowWib = DateTime.now().setZone("Asia/Jakarta");
    const todayWib = nowWib.startOf("day");
    const targetWib = todayWib.set({ hour, minute });

    if (targetWib <= nowWib) {
      return targetWib.plus({ days: 1 }).toUTC().toJSDate();
    }

    return targetWib.toUTC().toJSDate();
  }
}
