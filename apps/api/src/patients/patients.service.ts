import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WahaClientService } from "../waha-client/waha-client.service";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PaginationRequest } from "@dm-tracker/shared";
import { renderTemplate } from "@dm-tracker/shared";

@Injectable()
export class PatientsService {
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
          phone: true,
          dob: true,
          consentStatus: true,
          consentAt: true,
          active: true,
          createdAt: true,
          _count: { select: { medications: true } },
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
        medications: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException("Pasien tidak ditemukan");
    }

    return { data: patient };
  }

  async create(dto: CreatePatientDto, adminId: string) {
    const existing = await this.prisma.patient.findUnique({
      where: { waNumber: dto.waNumber },
    });

    if (existing) {
      throw new ConflictException("Nomor WA sudah terdaftar");
    }

    const patient = await this.prisma.patient.create({
      data: {
        name: dto.name,
        waNumber: dto.waNumber,
        phone: dto.phone,
        dob: dto.dob ? new Date(dto.dob) : null,
        consentStatus: "pending",
        createdById: adminId,
      },
    });

    this.sendOptIn(patient.id, patient.name, patient.waNumber);

    return { data: patient };
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
        ...(dto.phone !== undefined && { phone: dto.phone }),
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
      this.sendOptIn(patient.id, patient.name, patient.waNumber);
    }

    return { data: null };
  }

  private async sendOptIn(patientId: string, name: string, waNumber: string) {
    const template = await this.prisma.templateMessage.findUnique({
      where: { key: "enrollment" },
    });

    if (!template) return;

    const chatId = `${waNumber}@c.us`;
    const body = renderTemplate(template.body, { name });

    try {
      await this.waha.sendButtons(chatId, template.title, body, "", [
        { type: "reply", text: template.buttonLabels[0] || "Setuju" },
        { type: "reply", text: template.buttonLabels[1] || "Nanti saja" },
      ]);

      await this.prisma.outboundMessage.create({
        data: {
          patientId,
          kind: "opt_in",
          payload: { chatId, body, buttons: template.buttonLabels },
          status: "sent",
        },
      });
    } catch {
      await this.prisma.outboundMessage.create({
        data: {
          patientId,
          kind: "opt_in",
          payload: { chatId, body, buttons: template.buttonLabels },
          status: "failed",
          error: "Gagal mengirim pesan opt-in",
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
