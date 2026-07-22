import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePatientMedicationDto } from "./dto/create-patient-medication.dto";
import { UpdatePatientMedicationDto } from "./dto/update-patient-medication.dto";
import { PaginationRequest } from "@kawalgula/shared";

@Injectable()
export class PatientMedicationsService {
  constructor(private prisma: PrismaService) {}

  async list(dto: PaginationRequest & { patientId?: string }) {
    const { page = 1, size = 10, patientId } = dto;
    const skip = (page - 1) * size;

    const where: any = { active: true };
    if (patientId) where.patientId = patientId;

    const [rows, total] = await Promise.all([
      this.prisma.patientMedication.findMany({
        where,
        skip,
        take: Math.min(size, 100),
        orderBy: { createdAt: "asc" },
        include: { medication: true },
      }),
      this.prisma.patientMedication.count({ where }),
    ]);

    return {
      data: rows,
      pagination: { page, size, total_item: total, total_pages: Math.ceil(total / size) },
    };
  }

  async assign(dto: CreatePatientMedicationDto, adminId: string) {
    const assignment = await this.prisma.patientMedication.create({
      data: {
        patientId: dto.patientId,
        medicationId: dto.medicationId,
        scheduleTimes: dto.scheduleTimes,
        createdById: adminId,
      },
      include: { medication: true },
    });
    return { data: assignment };
  }

  async update(id: string, dto: UpdatePatientMedicationDto) {
    const assignment = await this.prisma.patientMedication.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException("Assignment tidak ditemukan");

    if (dto.scheduleTimes !== undefined) {
      await this.prisma.reminder.deleteMany({
        where: { patientMedicationId: id, status: "pending" },
      });
    }

    const updated = await this.prisma.patientMedication.update({
      where: { id },
      data: {
        ...(dto.scheduleTimes !== undefined && { scheduleTimes: dto.scheduleTimes }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { medication: true },
    });
    return { data: updated };
  }

  async delete(id: string) {
    const assignment = await this.prisma.patientMedication.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException("Assignment tidak ditemukan");
    await this.prisma.patientMedication.delete({ where: { id } });
  }
}
