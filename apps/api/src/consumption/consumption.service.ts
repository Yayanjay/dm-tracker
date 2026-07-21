import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationRequest } from "@dm-tracker/shared";

@Injectable()
export class ConsumptionService {
  constructor(private prisma: PrismaService) {}

  async list(dto: PaginationRequest & { patientId?: string }) {
    const { page = 1, size = 10, search, sort, patientId } = dto;
    const skip = (page - 1) * size;

    const where: any = {};
    if (patientId) {
      where.patientId = patientId;
    }
    if (search?.value && search?.key?.length) {
      const keys = search.key.filter((k) =>
        ["patientName", "medicationName"].includes(k),
      );
      if (keys.length) {
        where.OR = [];
        for (const k of keys) {
          if (k === "patientName") {
            where.OR.push({
              patient: { name: { contains: search.value, mode: "insensitive" } },
            });
          }
          if (k === "medicationName") {
            where.OR.push({
              medication: { name: { contains: search.value, mode: "insensitive" } },
            });
          }
        }
      }
    }

    const orderBy: any[] = [{ reportedAt: "desc" }];
    if (sort?.length) {
      for (const s of sort) {
        const allowedKeys = ["reportedAt", "status"];
        if (allowedKeys.includes(s.key)) {
          orderBy.unshift({ [s.key]: s.direction.toLowerCase() });
        }
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.consumptionLog.findMany({
        where,
        skip,
        take: Math.min(size, 100),
        orderBy,
        include: {
          patient: { select: { name: true, waNumber: true } },
          medication: { select: { name: true } },
        },
      }),
      this.prisma.consumptionLog.count({ where }),
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

  async exportCsv(dto: PaginationRequest & { patientId?: string }) {
    const { data: rows } = await this.list({
      ...dto,
      page: 1,
      size: 10000,
    });

    let csv = "Tanggal,Nama Pasien,WA Number,Nama Obat,Status,Sumber\n";

    for (const row of rows as any[]) {
      const date = new Date(row.reportedAt).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });
      csv += `${date},${row.patient.name},${row.patient.waNumber},${row.medication.name},${row.status},${row.source}\n`;
    }

    return csv;
  }
}
