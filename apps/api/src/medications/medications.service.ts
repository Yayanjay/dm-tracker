import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMedicationDto } from "./dto/create-medication.dto";
import { UpdateMedicationDto } from "./dto/update-medication.dto";
import { PaginationRequest } from "@dm-tracker/shared";

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: PaginationRequest & { patientId?: string }) {
    const { page = 1, size = 10, search, sort, patientId } = dto;
    const skip = (page - 1) * size;

    const where: any = {};
    if (patientId) {
      where.patientId = patientId;
    }
    if (search?.value && search?.key?.length) {
      const keys = search.key.filter((k) => ["name"].includes(k));
      if (keys.length) {
        where.OR = keys.map((k) => ({
          [k]: { contains: search.value, mode: "insensitive" },
        }));
      }
    }

    const orderBy: any[] = [];
    if (sort?.length) {
      for (const s of sort) {
        const allowedKeys = ["name", "dosage", "createdAt"];
        if (allowedKeys.includes(s.key)) {
          orderBy.push({ [s.key]: s.direction.toLowerCase() });
        }
      }
    }
    if (!orderBy.length) {
      orderBy.push({ createdAt: "desc" });
    }

    const [rows, total] = await Promise.all([
      this.prisma.medication.findMany({
        where,
        skip,
        take: Math.min(size, 100),
        orderBy,
      }),
      this.prisma.medication.count({ where }),
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
    const medication = await this.prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException("Obat tidak ditemukan");
    }

    return { data: medication };
  }

  async create(dto: CreateMedicationDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException("Pasien tidak ditemukan");
    }

    const medication = await this.prisma.medication.create({
      data: {
        patientId: dto.patientId,
        name: dto.name,
        dosage: dto.dosage,
        unit: dto.unit,
        scheduleTimes: dto.scheduleTimes,
      },
    });

    return { data: medication };
  }

  async update(id: string, dto: UpdateMedicationDto) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException("Obat tidak ditemukan");
    }

    if (dto.scheduleTimes !== undefined) {
      await this.prisma.reminder.deleteMany({
        where: {
          medicationId: id,
          status: "pending",
        },
      });
    }

    const updated = await this.prisma.medication.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.dosage !== undefined && { dosage: dto.dosage }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.scheduleTimes !== undefined && { scheduleTimes: dto.scheduleTimes }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return { data: updated };
  }
}
