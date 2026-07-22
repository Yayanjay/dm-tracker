import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMedicationDto } from "./dto/create-medication.dto";
import { UpdateMedicationDto } from "./dto/update-medication.dto";
import { PaginationRequest } from "@kawalgula/shared";

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: PaginationRequest) {
    const { page = 1, size = 10, search, sort } = dto;
    const skip = (page - 1) * size;

    const where: any = {};
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
        const allowedKeys = ["name", "createdAt"];
        if (allowedKeys.includes(s.key)) {
          orderBy.push({ [s.key]: s.direction.toLowerCase() });
        }
      }
    }
    if (!orderBy.length) {
      orderBy.push({ createdAt: "desc" });
    }

    const [rows, total] = await Promise.all([
      this.prisma.medication.findMany({ where, skip, take: Math.min(size, 100), orderBy }),
      this.prisma.medication.count({ where }),
    ]);

    return {
      data: rows,
      pagination: { page, size, total_item: total, total_pages: Math.ceil(total / size) },
    };
  }

  async findById(id: string) {
    const medication = await this.prisma.medication.findUnique({ where: { id } });
    if (!medication) throw new NotFoundException("Obat tidak ditemukan");
    return { data: medication };
  }

  async create(dto: CreateMedicationDto, adminId: string) {
    const medication = await this.prisma.medication.create({
      data: { name: dto.name, dosage: dto.dosage, unit: dto.unit, createdById: adminId },
    });
    return { data: medication };
  }

  async update(id: string, dto: UpdateMedicationDto) {
    const medication = await this.prisma.medication.findUnique({ where: { id } });
    if (!medication) throw new NotFoundException("Obat tidak ditemukan");

    const updated = await this.prisma.medication.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.dosage !== undefined && { dosage: dto.dosage }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
      },
    });
    return { data: updated };
  }

  async delete(id: string) {
    const medication = await this.prisma.medication.findUnique({ where: { id } });
    if (!medication) throw new NotFoundException("Obat tidak ditemukan");
    await this.prisma.medication.delete({ where: { id } });
  }
}
