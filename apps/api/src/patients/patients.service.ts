import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WahaClientService } from "../waha-client/waha-client.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PaginationRequest } from "@kawalgula/shared";
import { renderTemplate } from "@kawalgula/shared";

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private prisma: PrismaService,
    private waha: WahaClientService,
  ) {}

  async list(dto: PaginationRequest) {
    const { page = 1, size = 10, search, sort } = dto;
    const skip = (page - 1) * size;

    const where: any = { active: true };
    if (search?.value && search?.key?.length) {
      const keys = search.key.filter((k) => ["name", "waNumber"].includes(k));
      if (keys.length) {
        where.OR = keys.map((k) => ({
          [k]: { contains: search.value, mode: "insensitive" },
        }));
      }
    }

    const orderBy: any[] = [];
    if (sort?.length) {
      for (const s of sort) {
        const allowedKeys = ["name", "waNumber", "createdAt", "consentStatus"];
        if (allowedKeys.includes(s.key)) {
          orderBy.push({ [s.key]: s.direction.toLowerCase() });
        }
      }
    }
    if (!orderBy.length) {
      orderBy.push({ createdAt: "desc" });
    }

    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: Math.min(size, 100),
        orderBy,
        select: {
          id: true,
          name: true,
          waNumber: true,
          dob: true,
          consentStatus: true,
          consentAt: true,
          active: true,
          createdAt: true,
          _count: { select: { patientMedications: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: rows,
      pagination: {
        page,
        size,
        total_item: total,
        total_pages: Math.ceil(total / size),
      },
    };
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, active: true },
      include: {
        patientMedications: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
          include: { medication: true },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException("Pasien tidak ditemukan");
    }

    return { data: patient };
  }

  async create(dto: CreatePatientDto, adminId: string) {
    const waNumber = this.normalizeWaNumber(dto.waNumber);

    const existing = await this.prisma.patient.findUnique({
      where: { waNumber },
    });

    if (existing) {
      throw new ConflictException("Nomor WA sudah terdaftar");
    }

    const patient = await this.prisma.patient.create({
      data: {
        name: dto.name,
        waNumber,
        dob: dto.dob ? new Date(dto.dob) : null,
        consentStatus: "pending",
        createdById: adminId,
      },
    });

    await this.sendOptIn(patient.id, patient.name, patient.waNumber);

    return { data: patient };
  }

  private normalizeWaNumber(raw: string): string {
    const digits = raw.replace(/\D/g, "");

    let normalized: string;
    if (digits.startsWith("62")) {
      normalized = digits;
    } else if (digits.startsWith("0")) {
      normalized = "62" + digits.slice(1);
    } else if (digits.startsWith("8")) {
      normalized = "62" + digits;
    } else {
      throw new BadRequestException(
        "Format nomor WA tidak valid. Gunakan 08xxx atau +62xxx.",
      );
    }

    if (normalized.length < 10 || normalized.length > 15) {
      throw new BadRequestException(
        "Nomor WA harus 10-15 digit setelah kode negara.",
      );
    }

    return normalized;
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, active: true },
    });

    if (!patient) {
      throw new NotFoundException("Pasien tidak ditemukan");
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.dob !== undefined && { dob: dto.dob ? new Date(dto.dob) : undefined }),
      },
    });

    return { data: updated };
  }

  async resendOptin(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, active: true },
    });

    if (!patient) {
      throw new NotFoundException("Pasien tidak ditemukan");
    }

    if (patient.consentStatus === "opted_in") {
      this.sendAlreadyOptedIn(patient.name, patient.waNumber);
    } else {
    await this.sendOptIn(patient.id, patient.name, patient.waNumber);
    }

    return { data: null };
  }

  async delete(id: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) throw new NotFoundException("Pasien tidak ditemukan");
    await this.prisma.patient.delete({ where: { id } });
  }

  private async sendOptIn(patientId: string, name: string, waNumber: string) {
    const template = await this.prisma.templateMessage.findUnique({
      where: { key: "enrollment" },
    });

    if (!template) return;

    const chatId = `${waNumber}@c.us`;
    const body = renderTemplate(template.body, { name });

    try {
      const text = `${template.title}\n\n${body}\n\nBalas "setuju" untuk mendaftar atau "nanti" untuk menunda.`;
      await this.waha.sendText(chatId, text);
      this.logger.log(`Opt-in sent to ${name} (${waNumber})`);

      const rawLid = await this.waha.getLidByPhone(waNumber);
      if (rawLid) {
        const lid = rawLid.replace("@lid", "");
        await this.prisma.patient.update({
          where: { id: patientId },
          data: { lid },
        });
        this.logger.log(`LID stored for ${name}: ${lid}`);
      }

      await this.prisma.outboundMessage.create({
        data: {
          patientId,
          kind: "opt_in",
          payload: { chatId, body, buttons: template.buttonLabels },
          status: "sent",
          createdById: "SYSTEM",
        },
      });
    } catch (error: any) {
      this.logger.error(`Opt-in send failed for ${name}: ${error.message}`);
      await this.prisma.outboundMessage.create({
        data: {
          patientId,
          kind: "opt_in",
          payload: { chatId, body, buttons: template.buttonLabels },
          status: "failed",
          error: "Gagal mengirim pesan opt-in",
          createdById: "SYSTEM",
        },
      });
    }
  }

  private async sendAlreadyOptedIn(name: string, waNumber: string) {
    const template = await this.prisma.templateMessage.findUnique({
      where: { key: "already_opted_in" },
    });

    if (!template) return;

    const chatId = `${waNumber}@c.us`;
    const body = renderTemplate(template.body, { name });

    try {
      await this.waha.sendText(chatId, `${template.title}\n\n${body}`);
    } catch {
      // silently fail
    }
  }
}
